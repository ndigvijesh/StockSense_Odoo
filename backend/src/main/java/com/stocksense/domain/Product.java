package com.stocksense.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

@Entity
@Table(name = "products")
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @NotBlank @Column(nullable = false)
    private String name;
    @NotBlank @Column(nullable = false, unique = true)
    private String sku;
    @NotBlank @Column(nullable = false)
    private String category;
    @NotBlank @Column(nullable = false)
    private String unitOfMeasure;
    @PositiveOrZero @Column(nullable = false)
    private double reorderPoint;
    @Column(nullable = false)
    private boolean active = true;

    protected Product() { }
    public Product(String name, String sku, String category, String unitOfMeasure, double reorderPoint) {
        this.name = name; this.sku = sku; this.category = category; this.unitOfMeasure = unitOfMeasure; this.reorderPoint = reorderPoint;
    }
    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getUnitOfMeasure() { return unitOfMeasure; }
    public void setUnitOfMeasure(String unitOfMeasure) { this.unitOfMeasure = unitOfMeasure; }
    public double getReorderPoint() { return reorderPoint; }
    public void setReorderPoint(double reorderPoint) { this.reorderPoint = reorderPoint; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}