package com.fleet.gantt.model;

import java.io.Serializable;
import java.util.Objects;

/**
 * Representa un recurso de la flota (Tractor, Plataforma, Conductor, etc.)
 * sobre el cual se programan los viajes y tareas en la línea de tiempo.
 */
public class FleetResource implements Serializable {

    private static final long serialVersionUID = 1L;

    private String id;
    private String name;
    private String type;   // ej. "tractor", "plataforma", "conductor"
    private String group;  // ej. "TRACTORES", "PLATAFORMAS", "CONDUCTORES"

    public FleetResource() {
    }

    public FleetResource(String id, String name, String type, String group) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.group = group;
    }

    // ==========================================
    // Getters y Setters
    // ==========================================

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getGroup() {
        return group;
    }

    public void setGroup(String group) {
        this.group = group;
    }

    // ==========================================
    // Métodos estándar (equals, hashCode, toString)
    // ==========================================

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        FleetResource that = (FleetResource) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "FleetResource{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", type='" + type + '\'' +
                ", group='" + group + '\'' +
                '}';
    }
}