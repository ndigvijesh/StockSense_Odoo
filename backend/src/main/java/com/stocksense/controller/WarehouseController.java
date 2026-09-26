package com.stocksense.controller;

import com.stocksense.domain.Warehouse;
import com.stocksense.repository.WarehouseRepository;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/warehouses")
public class WarehouseController {
    private final WarehouseRepository warehouses;
    public WarehouseController(WarehouseRepository warehouses) { this.warehouses = warehouses; }
    @GetMapping public List<Warehouse> findAll() { return warehouses.findAll(); }
    @PostMapping public Warehouse create(@Valid @RequestBody Warehouse warehouse) { return warehouses.save(warehouse); }
}