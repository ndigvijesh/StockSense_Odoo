package com.stocksense.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "stock_balances", uniqueConstraints = @UniqueConstraint(columnNames = {"product_id", "warehouse_id", "location"}), indexes = @Index(columnList = "product_id,warehouse_id"))
public class StockBalance {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Product product;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Warehouse warehouse;
    private String location;
    private double quantity;

    protected StockBalance() { }
    public StockBalance(Product product, Warehouse warehouse, String location, double quantity) { this.product = product; this.warehouse = warehouse; this.location = location; this.quantity = quantity; }
    public Long getId() { return id; }
    public Product getProduct() { return product; }
    public Warehouse getWarehouse() { return warehouse; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public double getQuantity() { return quantity; }
    public void setQuantity(double quantity) { this.quantity = quantity; }
}