package com.stocksense.controller;

import com.stocksense.domain.Product;
import com.stocksense.service.ProductService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductService products;
    public ProductController(ProductService products) { this.products = products; }
    @GetMapping public List<Product> findAll() { return products.findAll(); }
    @GetMapping("/{id}") public Product findById(@PathVariable Long id) { return products.findById(id); }
    @GetMapping("/{id}/stock") public List<ProductService.StockView> stock(@PathVariable Long id) { return products.stock(id); }
    @PostMapping public Product create(@Valid @RequestBody Product product) { return products.create(product); }
    @PutMapping("/{id}") public Product update(@PathVariable Long id, @Valid @RequestBody Product product) { return products.update(id, product); }
    @DeleteMapping("/{id}") public Map<String, String> delete(@PathVariable Long id) { products.delete(id); return Map.of("message", "Product deleted"); }
}