package com.fleet.gantt.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.io.Serializable;
import java.util.Objects;

/**
 * Encapsula la información operativa y detallada de un viaje o evento
 * (origen, destino, asignaciones de plataforma/conductor y observaciones).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class TaskDetails implements Serializable {

    private static final long serialVersionUID = 1L;

    private String origen;
    private String destino;
    private String conductor;
    private String plataforma;
    private String tipo;
    private String observaciones;

    public TaskDetails() {
    }

    public TaskDetails(String origen, String destino, String conductor, 
                       String plataforma, String tipo, String observaciones) {
        this.origen = origen;
        this.destino = destino;
        this.conductor = conductor;
        this.plataforma = plataforma;
        this.tipo = tipo; // ej. "Viaje", "Mantenimiento", "Inspección"
        this.observaciones = observaciones;
    }

    // ==========================================
    // Getters y Setters
    // ==========================================

    public String getOrigen() {
        return origen;
    }

    public void setOrigen(String origen) {
        this.origen = origen;
    }

    public String getDestino() {
        return destino;
    }

    public void setDestino(String destino) {
        this.destino = destino;
    }

    public String getConductor() {
        return conductor;
    }

    public void setConductor(String conductor) {
        this.conductor = conductor;
    }

    public String getPlataforma() {
        return plataforma;
    }

    public void setPlataforma(String plataforma) {
        this.plataforma = plataforma;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }

    // ==========================================
    // Métodos estándar (equals, hashCode, toString)
    // ==========================================

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TaskDetails that = (TaskDetails) o;
        return Objects.equals(origen, that.origen) &&
               Objects.equals(destino, that.destino) &&
               Objects.equals(conductor, that.conductor) &&
               Objects.equals(plataforma, that.plataforma) &&
               Objects.equals(tipo, that.tipo) &&
               Objects.equals(observaciones, that.observaciones);
    }

    @Override
    public int hashCode() {
        return Objects.hash(origen, destino, conductor, plataforma, tipo, observaciones);
    }

    @Override
    public String toString() {
        return "TaskDetails{" +
                "origen='" + origen + '\'' +
                ", destino='" + destino + '\'' +
                ", conductor='" + conductor + '\'' +
                ", plataforma='" + plataforma + '\'' +
                ", tipo='" + tipo + '\'' +
                ", observaciones='" + observaciones + '\'' +
                '}';
    }
}