package com.stocksense.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.stocksense.domain.Product;
import com.stocksense.domain.StockBalance;
import com.stocksense.domain.Warehouse;
import com.stocksense.repository.ProductRepository;
import com.stocksense.repository.StockBalanceRepository;
import com.stocksense.repository.StockMovementRepository;
import com.stocksense.repository.WarehouseRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
class InventoryServiceIntegrationTest {
    @Autowired private InventoryService inventory;
    @Autowired private ProductRepository products;
    @Autowired private WarehouseRepository warehouses;
    @Autowired private StockBalanceRepository balances;
    @Autowired private StockMovementRepository movements;

    @Test
    @Transactional
    void validatingReceiptUpdatesBalanceAndWritesLedgerMovement() {
        Product product = products.findBySkuIgnoreCase("STL-012-CR").orElseThrow();
        Warehouse warehouse = warehouses.findAll().get(0);
        String location = "Main / A-01";
        double before = balances.findByProductIdAndWarehouseIdAndLocation(product.getId(), warehouse.getId(), location)
                .map(StockBalance::getQuantity).orElse(0.0);
        long movementCount = movements.count();

        InventoryService.OperationRequest request = new InventoryService.OperationRequest("RECEIPT", "Test supplier",
                warehouse.getId(), null, location, null, List.of(new InventoryService.LineRequest(product.getId(), 25)));
        var draft = inventory.create(request);
        var completed = inventory.validate(draft.id());

        assertThat(completed.status()).isEqualTo("Done");
        assertThat(balances.findByProductIdAndWarehouseIdAndLocation(product.getId(), warehouse.getId(), location))
                .get().extracting(StockBalance::getQuantity).isEqualTo(before + 25);
        assertThat(movements.count()).isEqualTo(movementCount + 1);
    }
}