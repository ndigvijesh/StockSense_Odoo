package com.stocksense.service;

import com.stocksense.domain.InventoryOperation;
import com.stocksense.domain.OperationLine;
import com.stocksense.domain.Product;
import com.stocksense.domain.StockBalance;
import com.stocksense.domain.StockMovement;
import com.stocksense.domain.Warehouse;
import com.stocksense.repository.InventoryOperationRepository;
import com.stocksense.repository.ProductRepository;
import com.stocksense.repository.StockBalanceRepository;
import com.stocksense.repository.StockMovementRepository;
import com.stocksense.repository.WarehouseRepository;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {
    private final InventoryOperationRepository operations;
    private final ProductRepository products;
    private final WarehouseRepository warehouses;
    private final StockBalanceRepository balances;
    private final StockMovementRepository movements;

    public InventoryService(InventoryOperationRepository operations, ProductRepository products, WarehouseRepository warehouses,
                            StockBalanceRepository balances, StockMovementRepository movements) {
        this.operations = operations; this.products = products; this.warehouses = warehouses; this.balances = balances; this.movements = movements;
    }

    public record LineRequest(Long productId, double quantity) { }
    public record OperationRequest(String type, String partner, Long warehouseId, Long destinationWarehouseId,
                                   String location, String destinationLocation, List<LineRequest> lines) { }
    public record OperationLineView(Long productId, String productName, String sku, double quantity) { }
    public record OperationView(Long id, String reference, String type, String partner, String status, String warehouse,
                                Long warehouseId, String location, String destinationLocation, Instant createdAt,
                                List<OperationLineView> lines) { }
    public record MovementView(Long id, String reference, String type, String product, String sku, String warehouse,
                               String location, double quantityDelta, double balanceAfter, Instant occurredAt) { }

    @Transactional(readOnly = true)
    public List<OperationView> findOperations() { return operations.findAllByOrderByCreatedAtDesc().stream().map(this::toView).toList(); }
    @Transactional(readOnly = true)
    public List<MovementView> findMovements() {
        return movements.findTop100ByOrderByOccurredAtDesc().stream().map(movement -> new MovementView(movement.getId(), movement.getReference(), movement.getType(),
                movement.getProduct().getName(), movement.getProduct().getSku(), movement.getWarehouse().getName(), movement.getLocation(),
                movement.getQuantityDelta(), movement.getBalanceAfter(), movement.getOccurredAt())).toList();
    }

    @Transactional
    public OperationView create(OperationRequest request) {
        String type = request.type() == null ? "" : request.type().trim().toUpperCase(Locale.ROOT);
        if (!List.of("RECEIPT", "DELIVERY", "TRANSFER", "ADJUSTMENT").contains(type)) throw new IllegalArgumentException("Unsupported operation type");
        if (request.lines() == null || request.lines().isEmpty()) throw new IllegalArgumentException("Add at least one product line");
        Warehouse warehouse = warehouses.findById(request.warehouseId()).orElseThrow(() -> new IllegalArgumentException("Warehouse not found"));
        if (type.equals("TRANSFER") && request.destinationWarehouseId() == null) throw new IllegalArgumentException("Destination warehouse is required for transfers");
        InventoryOperation operation = new InventoryOperation(reference(type), type, request.partner(), warehouse,
                request.destinationWarehouseId(), location(request.location()), location(request.destinationLocation()));
        request.lines().forEach(line -> {
            if (type.equals("ADJUSTMENT") ? line.quantity() < 0 : line.quantity() <= 0) throw new IllegalArgumentException("Quantity must be positive, except an adjustment count may be zero");
            Product product = products.findById(line.productId()).orElseThrow(() -> new IllegalArgumentException("Product not found: " + line.productId()));
            operation.addLine(new OperationLine(product, line.quantity()));
        });
        return toView(operations.save(operation));
    }

    @Transactional
    public OperationView validate(Long id) {
        InventoryOperation operation = operations.findById(id).orElseThrow(() -> new IllegalArgumentException("Operation not found: " + id));
        if (operation.getStatus().equals("Done")) throw new IllegalStateException("Operation has already been validated");
        Warehouse source = operation.getWarehouse();
        Warehouse destination = operation.getType().equals("TRANSFER")
                ? warehouses.findById(operation.getDestinationWarehouseId()).orElseThrow(() -> new IllegalArgumentException("Destination warehouse not found")) : null;
        for (OperationLine line : operation.getLines()) {
            Product product = line.getProduct();
            double quantity = line.getQuantity();
            String sourceLocation = operation.getLocation();
            if (operation.getType().equals("RECEIPT")) {
                change(product, source, sourceLocation, quantity, operation);
            } else if (operation.getType().equals("DELIVERY")) {
                change(product, source, sourceLocation, -quantity, operation);
            } else if (operation.getType().equals("TRANSFER")) {
                change(product, source, sourceLocation, -quantity, operation);
                change(product, destination, operation.getDestinationLocation(), quantity, operation);
            } else {
                double current = balances.findByProductIdAndWarehouseIdAndLocation(product.getId(), source.getId(), sourceLocation).map(StockBalance::getQuantity).orElse(0.0);
                change(product, source, sourceLocation, quantity - current, operation);
            }
        }
        operation.setStatus("Done");
        return toView(operations.save(operation));
    }

    private void change(Product product, Warehouse warehouse, String location, double delta, InventoryOperation operation) {
        StockBalance balance = balances.findByProductIdAndWarehouseIdAndLocation(product.getId(), warehouse.getId(), location)
                .orElseGet(() -> new StockBalance(product, warehouse, location, 0));
        double next = balance.getQuantity() + delta;
        if (next < 0) throw new IllegalStateException("Insufficient stock for " + product.getSku() + " at " + location);
        balance.setQuantity(next);
        balances.save(balance);
        movements.save(new StockMovement(product, warehouse, operation.getReference(), operation.getType(), location, delta, next));
    }

    public Map<String, Object> dashboard() {
        List<Product> activeProducts = products.findAll().stream().filter(Product::isActive).toList();
        long low = activeProducts.stream().filter(product -> balances.findByProductId(product.getId()).stream().mapToDouble(StockBalance::getQuantity).sum() <= product.getReorderPoint()).count();
        return Map.of("totalProducts", activeProducts.size(), "totalStockUnits", balances.totalUnits(), "lowStockProducts", low,
                "outOfStockProducts", activeProducts.stream().filter(product -> balances.findByProductId(product.getId()).stream().mapToDouble(StockBalance::getQuantity).sum() <= 0).count(),
                "pendingReceipts", operations.countByTypeAndStatusNot("RECEIPT", "Done"),
                "pendingDeliveries", operations.countByTypeAndStatusNot("DELIVERY", "Done"),
                "scheduledTransfers", operations.countByTypeAndStatusNot("TRANSFER", "Done"), "updatedAt", Instant.now());
    }

    private String reference(String type) {
        String prefix = switch (type) { case "RECEIPT" -> "IN"; case "DELIVERY" -> "OUT"; case "TRANSFER" -> "INT"; default -> "ADJ"; };
        return "WH/" + prefix + "/" + ThreadLocalRandom.current().nextInt(100000, 1000000);
    }
        private OperationView toView(InventoryOperation operation) {
        List<OperationLineView> lines = operation.getLines().stream().map(line -> new OperationLineView(line.getProduct().getId(),
            line.getProduct().getName(), line.getProduct().getSku(), line.getQuantity())).toList();
        return new OperationView(operation.getId(), operation.getReference(), operation.getType(), operation.getPartner(),
            operation.getStatus(), operation.getWarehouse().getName(), operation.getWarehouse().getId(), operation.getLocation(),
            operation.getDestinationLocation(), operation.getCreatedAt(), lines);
        }
    private String location(String value) { return value == null || value.isBlank() ? "Default" : value.trim(); }
}