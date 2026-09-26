package com.stocksense.controller;

import com.stocksense.service.InventoryService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class InventoryController {
    private final InventoryService inventory;
    public InventoryController(InventoryService inventory) { this.inventory = inventory; }
    @GetMapping("/dashboard") public Map<String, Object> dashboard() { return inventory.dashboard(); }
    @GetMapping("/operations") public List<InventoryService.OperationView> operations() { return inventory.findOperations(); }
    @PostMapping("/operations") public InventoryService.OperationView create(@RequestBody InventoryService.OperationRequest request) { return inventory.create(request); }
    @PostMapping("/operations/{id}/validate") public InventoryService.OperationView validate(@PathVariable Long id) { return inventory.validate(id); }
    @GetMapping("/movements") public List<InventoryService.MovementView> movements() { return inventory.findMovements(); }
}