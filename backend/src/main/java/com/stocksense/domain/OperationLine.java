package com.stocksense.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "operation_lines")
public class OperationLine {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Product product;
    private double quantity;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private InventoryOperation operation;

    protected OperationLine() { }
    public OperationLine(Product product, double quantity) { this.product = product; this.quantity = quantity; }
    public Long getId() { return id; }
    public Product getProduct() { return product; }
    public double getQuantity() { return quantity; }
    @JsonIgnore public InventoryOperation getOperation() { return operation; }
    public void setOperation(InventoryOperation operation) { this.operation = operation; }
}