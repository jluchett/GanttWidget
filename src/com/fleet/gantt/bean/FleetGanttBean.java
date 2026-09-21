package com.fleet.gantt.bean;

import com.fleet.gantt.model.*;
import com.fleet.gantt.service.FleetConflictService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import javax.annotation.PostConstruct;
import javax.faces.bean.ManagedBean;
import javax.faces.bean.ViewScoped;
import java.io.Serializable;

@SuppressWarnings("deprecation")
@ManagedBean
@ViewScoped
public class FleetGanttBean implements Serializable {

    private String fleetScheduleJson;
    private final FleetConflictService conflictService = new FleetConflictService();

    @PostConstruct
    public void init() {
        // Aquí puedes cargar el JSON desde BD, un EJB o WebService
        String rawJson = getSampleJsonPayload();
        
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            
            FleetSchedule schedule = mapper.readValue(rawJson, FleetSchedule.class);
            
            // Detectar y enriquecer conflictos en Java
            conflictService.detectAndMarkConflicts(schedule.getTasks());
            
            this.fleetScheduleJson = mapper.writeValueAsString(schedule);
        } catch (Exception e) {
            e.printStackTrace();
            this.fleetScheduleJson = rawJson; // fallback
        }
    }

    public String getFleetScheduleJson() {
        return fleetScheduleJson;
    }

    private String getSampleJsonPayload() {
        // Retorna el JSON proporcionado por el usuario
        return "{\n" +
               "  \"resources\": [\n" +
               "    {\"id\": \"T0005\", \"name\": \"T0005 - 0569CSR\", \"type\": \"tractor\", \"group\": \"TRACTORES\"},\n" +
               "    {\"id\": \"T0006\", \"name\": \"T0006 - 0680CGF\", \"type\": \"tractor\", \"group\": \"TRACTORES\"},\n" +
               "    {\"id\": \"T0009\", \"name\": \"T0009 - 3333CGC\", \"type\": \"tractor\", \"group\": \"TRACTORES\"},\n" +
               "    {\"id\": \"P0002\", \"name\": \"P0002 - R-6666-CCC\", \"type\": \"plataforma\", \"group\": \"PLATAFORMAS\"},\n" +
               "    {\"id\": \"P0018\", \"name\": \"P0018 - R-0419-CCC\", \"type\": \"plataforma\", \"group\": \"PLATAFORMAS\"},\n" +
               "    {\"id\": \"C0003\", \"name\": \"C0003 - PEDRO MARTINEZ LOPEZ\", \"type\": \"conductor\", \"group\": \"CONDUCTORES\"},\n" +
               "    {\"id\": \"C0009\", \"name\": \"C0009 - ALFONSO MARTIN REDON\", \"type\": \"conductor\", \"group\": \"CONDUCTORES\"},\n" +
               "    {\"id\": \"C0025\", \"name\": \"C0025 - ALBERTO DIAZ\", \"type\": \"conductor\", \"group\": \"CONDUCTORES\"}\n" +
               "  ],\n" +
               "  \"tasks\": [\n" +
               "    {\"id\": \"viaje-001\", \"resourceId\": \"T0005\", \"name\": \"PO SAN → AZUQUECA\", \"start\": \"2025-09-02T08:00:00\", \"end\": \"2025-09-02T14:30:00\", \"status\": \"en_viaje\", \"details\": {\"origen\": \"PO SAN\", \"destino\": \"AZUQUECA\", \"conductor\": \"C0003\", \"plataforma\": \"P0002\", \"tipo\": \"viaje\", \"observaciones\": null}},\n" +
               "    {\"id\": \"viaje-002\", \"resourceId\": \"T0005\", \"name\": \"PO SAN → SAN\", \"start\": \"2025-09-02T15:00:00\", \"end\": \"2025-09-02T21:00:00\", \"status\": \"en_viaje\", \"details\": {\"origen\": \"PO SAN\", \"destino\": \"SAN\", \"conductor\": \"C0003\", \"plataforma\": \"P0002\", \"tipo\": \"viaje\", \"observaciones\": null}},\n" +
               "    {\"id\": \"viaje-003\", \"resourceId\": \"T0006\", \"name\": \"Mantenimiento preventivo\", \"start\": \"2025-09-02T09:00:00\", \"end\": \"2025-09-02T13:00:00\", \"status\": \"mantenimiento\", \"details\": {\"origen\": null, \"destino\": null, \"conductor\": null, \"plataforma\": null, \"tipo\": \"mantenimiento\", \"observaciones\": \"Cambio de aceite y revisión de frenos\"}},\n" +
               "    {\"id\": \"viaje-004\", \"resourceId\": \"T0009\", \"name\": \"Avería en ruta\", \"start\": \"2025-09-02T10:30:00\", \"end\": \"2025-09-02T18:00:00\", \"status\": \"averiado\", \"details\": {\"origen\": \"PO SAN\", \"destino\": \"MADRID\", \"conductor\": \"C0009\", \"plataforma\": \"P0018\", \"tipo\": \"averia\", \"observaciones\": \"Problema en el sistema de refrigeración\"}},\n" +
               "    {\"id\": \"viaje-005\", \"resourceId\": \"T0006\", \"name\": \"Carga en muelle 3\", \"start\": \"2025-09-02T14:00:00\", \"end\": \"2025-09-02T16:30:00\", \"status\": \"en_carga\", \"details\": {\"origen\": \"PO SAN\", \"destino\": null, \"conductor\": \"C0025\", \"plataforma\": \"P0002\", \"tipo\": \"carga\", \"observaciones\": \"Carga de mercancía refrigerada\"}},\n" +
               "    {\"id\": \"viaje-006\", \"resourceId\": \"C0003\", \"name\": \"Descanso obligatorio\", \"start\": \"2025-09-02T14:30:00\", \"end\": \"2025-09-02T15:30:00\", \"status\": \"descanso\", \"details\": {\"origen\": null, \"destino\": null, \"conductor\": \"C0003\", \"plataforma\": null, \"tipo\": \"descanso\", \"observaciones\": \"Descanso reglamentario de 45 min\"}},\n" +
               "    {\"id\": \"viaje-007\", \"resourceId\": \"T0005\", \"name\": \"PO SAN → VALENCIA (retrasado)\", \"start\": \"2025-09-03T07:00:00\", \"end\": \"2025-09-03T15:00:00\", \"status\": \"retrasado\", \"details\": {\"origen\": \"PO SAN\", \"destino\": \"VALENCIA\", \"conductor\": \"C0003\", \"plataforma\": \"P0002\", \"tipo\": \"viaje\", \"observaciones\": \"Retraso por tráfico en A-3\"}},\n" +
               "    {\"id\": \"viaje-008\", \"resourceId\": \"T0009\", \"name\": \"Viaje cancelado\", \"start\": \"2025-09-03T08:00:00\", \"end\": \"2025-09-03T14:00:00\", \"status\": \"cancelado\", \"details\": {\"origen\": \"PO SAN\", \"destino\": \"BARCELONA\", \"conductor\": \"C0009\", \"plataforma\": \"P0018\", \"tipo\": \"viaje\", \"observaciones\": \"Cancelado por el cliente\"}},\n" +
               "    {\"id\": \"viaje-009\", \"resourceId\": \"P0002\", \"name\": \"Disponible\", \"start\": \"2025-09-02T00:00:00\", \"end\": \"2025-09-02T07:59:00\", \"status\": \"libre\", \"details\": {\"origen\": null, \"destino\": null, \"conductor\": null, \"plataforma\": \"P0002\", \"tipo\": \"disponible\", \"observaciones\": null}},\n" +
               "    {\"id\": \"viaje-010\", \"resourceId\": \"T0006\", \"name\": \"PO SAN → ZARAGOZA\", \"start\": \"2025-09-03T06:30:00\", \"end\": \"2025-09-03T12:00:00\", \"status\": \"en_viaje\", \"details\": {\"origen\": \"PO SAN\", \"destino\": \"ZARAGOZA\", \"conductor\": \"C0025\", \"plataforma\": \"P0002\", \"tipo\": \"viaje\", \"observaciones\": null}}\n" +
               "  ]\n" +
               "}";
    }
}