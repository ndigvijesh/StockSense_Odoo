package com.stocksense.service;

import com.stocksense.domain.Product;
import com.stocksense.domain.StockBalance;
import com.stocksense.repository.ProductRepository;
import com.stocksense.repository.StockBalanceRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {
    private final ProductRepository products;
    private final StockBalanceRepository balances;
    public ProductService(ProductRepository products, StockBalanceRepository balances) { this.products = products; this.balances = balances; }
    public List<Product> findAll() { return products.findAll(); }
    public Product findById(Long id) { return products.findById(id).orElseThrow(() -> new IllegalArgumentException("Product not found: " + id)); }
    public record StockView(Long warehouseId, String warehouse, String location, double quantity) { }
    @Transactional(readOnly = true)
    public List<StockView> stock(Long id) {
        findById(id);
        return balances.findByProductId(id).stream().map(balance -> new StockView(balance.getWarehouse().getId(), balance.getWarehouse().getName(), balance.getLocation(), balance.getQuantity())).toList();
    }
    @Transactional public Product create(Product product) { product.setSku(product.getSku().trim().toUpperCase()); return products.save(product); }
    @Transactional public Product update(Long id, Product changes) {
        Product product = findById(id);
        product.setName(changes.getName()); product.setSku(changes.getSku().trim().toUpperCase());
        product.setCategory(changes.getCategory()); product.setUnitOfMeasure(changes.getUnitOfMeasure());
        product.setReorderPoint(changes.getReorderPoint()); product.setActive(changes.isActive());
        return products.save(product);
    }
    @Transactional public void delete(Long id) { products.delete(findById(id)); }
}