package com.fleet.gantt.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Objeto raíz que representa el cronograma completo de la flota.
 * Mapea directamente la estructura JSON con las listas de recursos y tareas.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class FleetSchedule implements Serializable {

    private static final long serialVersionUID = 1L;

    private List<FleetResource> resources = new ArrayList<>();
    private List<FleetTask> tasks = new ArrayList<>();

    public FleetSchedule() {
    }

    public FleetSchedule(List<FleetResource> resources, List<FleetTask> tasks) {
        this.resources = resources != null ? resources : new ArrayList<>();
        this.tasks = tasks != null ? tasks : new ArrayList<>();
    }

    // ==========================================
    // Getters y Setters
    // ==========================================

    public List<FleetResource> getResources() {
        return resources;
    }

    public void setResources(List<FleetResource> resources) {
        this.resources = resources != null ? resources : new ArrayList<>();
    }

    public List<FleetTask> getTasks() {
        return tasks;
    }

    public void setTasks(List<FleetTask> tasks) {
        this.tasks = tasks != null ? tasks : new ArrayList<>();
    }

    // ==========================================
    // Métodos de Utilidad / Helper
    // ==========================================

    public void addResource(FleetResource resource) {
        if (resource != null) {
            this.resources.add(resource);
        }
    }

    public void addTask(FleetTask task) {
        if (task != null) {
            this.tasks.add(task);
        }
    }

    /**
     * Busca un recurso por su ID dentro del cronograma.
     */
    public Optional<FleetResource> findResourceById(String resourceId) {
        if (resourceId == null || resources == null) {
            return Optional.empty();
        }
        return resources.stream()
                .filter(r -> resourceId.equals(r.getId()))
                .findFirst();
    }

    // ==========================================
    // Métodos estándar (equals, hashCode, toString)
    // ==========================================

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        FleetSchedule that = (FleetSchedule) o;
        return Objects.equals(resources, that.resources) &&
               Objects.equals(tasks, that.tasks);
    }

    @Override
    public int hashCode() {
        return Objects.hash(resources, tasks);
    }

    @Override
    public String toString() {
        return "FleetSchedule{" +
                "totalResources=" + (resources != null ? resources.size() : 0) +
                ", totalTasks=" + (tasks != null ? tasks.size() : 0) +
                '}';
    }
}