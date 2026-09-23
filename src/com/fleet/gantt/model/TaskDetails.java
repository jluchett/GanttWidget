package com.fleet.gantt.model;

import java.io.Serializable;

public class TaskDetails implements Serializable {

    private static final long serialVersionUID = 1L;

    private String tractor;
    private String plataforma;
    private String conductor;
    private String origen;
    private String destino;
    private String tipo;
    private String observaciones;

    public TaskDetails() {
    }

    public TaskDetails(String tractor, String plataforma, String conductor, String origen, String destino, String tipo, String observaciones) {
        this.tractor = tractor;
        this.plataforma = plataforma;
        this.conductor = conductor;
        this.origen = origen;
        this.destino = destino;
        this.tipo = tipo;
        this.observaciones = observaciones;
    }

    public String getTractor() { return tractor; }
    public void setTractor(String tractor) { this.tractor = tractor; }

    public String getPlataforma() { return plataforma; }
    public void setPlataforma(String plataforma) { this.plataforma = plataforma; }

    public String getConductor() { return conductor; }
    public void setConductor(String conductor) { this.conductor = conductor; }

    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }

    public String getDestino() { return destino; }
    public void setDestino(String destino) { this.destino = destino; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }
}