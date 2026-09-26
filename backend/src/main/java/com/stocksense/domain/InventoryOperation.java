package com.stocksense.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "inventory_operations")
public class InventoryOperation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String reference;
    @Column(nullable = false)
    private String type;
    private String partner;
    @Column(nullable = false)
    private String status = "Draft";
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Warehouse warehouse;
    private Long destinationWarehouseId;
    private String location;
    private String destinationLocation;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    @OneToMany(mappedBy = "operation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OperationLine> lines = new ArrayList<>();

    protected InventoryOperation() { }
    public InventoryOperation(String reference, String type, String partner, Warehouse warehouse, Long destinationWarehouseId, String location, String destinationLocation) {
        this.reference = reference; this.type = type; this.partner = partner; this.warehouse = warehouse;
        this.destinationWarehouseId = destinationWarehouseId; this.location = location; this.destinationLocation = destinationLocation;
    }
    public void addLine(OperationLine line) { lines.add(line); line.setOperation(this); }
    public Long getId() { return id; }
    public String getReference() { return reference; }
    public String getType() { return type; }
    public String getPartner() { return partner; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Warehouse getWarehouse() { return warehouse; }
    public Long getDestinationWarehouseId() { return destinationWarehouseId; }
    public String getLocation() { return location; }
    public String getDestinationLocation() { return destinationLocation; }
    public Instant getCreatedAt() { return createdAt; }
    public List<OperationLine> getLines() { return lines; }
}