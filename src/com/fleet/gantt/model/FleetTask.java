package com.fleet.gantt.model;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class FleetTask implements Serializable {
    private String id;
    private String resourceId;
    private String name;
    private LocalDateTime start;
    private LocalDateTime end;
    private String status;
    private TaskDetails details;
    
    // Bandera y referencias a conflictos
    private boolean hasConflict = false;
    private List<String> conflictingTaskIds = new ArrayList<>();

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getResourceId() { return resourceId; }
    public void setResourceId(String resourceId) { this.resourceId = resourceId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public LocalDateTime getStart() { return start; }
    public void setStart(LocalDateTime start) { this.start = start; }
    public LocalDateTime getEnd() { return end; }
    public void setEnd(LocalDateTime end) { this.end = end; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public TaskDetails getDetails() { return details; }
    public void setDetails(TaskDetails details) { this.details = details; }
    public boolean isHasConflict() { return hasConflict; }
    public void setHasConflict(boolean hasConflict) { this.hasConflict = hasConflict; }
    public List<String> getConflictingTaskIds() { return conflictingTaskIds; }
    public void setConflictingTaskIds(List<String> conflictingTaskIds) { this.conflictingTaskIds = conflictingTaskIds; }
}