package com.stocksense.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "stock_movements")
public class StockMovement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Product product;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Warehouse warehouse;
    @Column(nullable = false)
    private String reference;
    @Column(nullable = false)
    private String type;
    private String location;
    private double quantityDelta;
    private double balanceAfter;
    @Column(nullable = false)
    private Instant occurredAt = Instant.now();

    protected StockMovement() { }
    public StockMovement(Product product, Warehouse warehouse, String reference, String type, String location, double quantityDelta, double balanceAfter) {
        this.product = product; this.warehouse = warehouse; this.reference = reference; this.type = type;
        this.location = location; this.quantityDelta = quantityDelta; this.balanceAfter = balanceAfter;
    }
    public Long getId() { return id; }
    public Product getProduct() { return product; }
    public Warehouse getWarehouse() { return warehouse; }
    public String getReference() { return reference; }
    public String getType() { return type; }
    public String getLocation() { return location; }
    public double getQuantityDelta() { return quantityDelta; }
    public double getBalanceAfter() { return balanceAfter; }
    public Instant getOccurredAt() { return occurredAt; }
}