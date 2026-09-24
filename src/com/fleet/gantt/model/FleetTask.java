package com.fleet.gantt.model;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class FleetTask implements Serializable {

    private static final long serialVersionUID = 1L;

    private String id;
    private String name;
    private LocalDateTime start;
    private LocalDateTime end;
    private String status;
    private String color; // Color hexadecimal opcional (ej: "#0969da")

    // Lista generica de recursos asignados a esta actividad
    private List<String> resourceIds = new ArrayList<>();

    // Metadata dinamica sin esquema rigido
    private Map<String, Object> details = new HashMap<>();

    // Control de solapamientos
    private boolean hasConflict = false;
    private List<String> conflictingTaskIds = new ArrayList<>();

    public FleetTask() {
    }

    public FleetTask(String id, String name, LocalDateTime start, LocalDateTime end, String status) {
        this.id = id;
        this.name = name;
        this.start = start;
        this.end = end;
        this.status = status;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public LocalDateTime getStart() { return start; }
    public void setStart(LocalDateTime start) { this.start = start; }

    public LocalDateTime getEnd() { return end; }
    public void setEnd(LocalDateTime end) { this.end = end; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public List<String> getResourceIds() { return resourceIds; }
    public void setResourceIds(List<String> resourceIds) {
        this.resourceIds = resourceIds != null ? resourceIds : new ArrayList<>();
    }

    public Map<String, Object> getDetails() { return details; }
    public void setDetails(Map<String, Object> details) {
        this.details = details != null ? details : new HashMap<>();
    }

    public boolean isHasConflict() { return hasConflict; }
    public void setHasConflict(boolean hasConflict) { this.hasConflict = hasConflict; }

    public List<String> getConflictingTaskIds() { return conflictingTaskIds; }
    public void setConflictingTaskIds(List<String> conflictingTaskIds) {
        this.conflictingTaskIds = conflictingTaskIds != null ? conflictingTaskIds : new ArrayList<>();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        FleetTask fleetTask = (FleetTask) o;
        return Objects.equals(id, fleetTask.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}