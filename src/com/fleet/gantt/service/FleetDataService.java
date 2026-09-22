package com.fleet.gantt.service;

import com.fleet.gantt.model.FleetSchedule;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import javax.faces.context.ExternalContext;
import javax.faces.context.FacesContext;
import java.io.InputStream;
import java.io.Serializable;

public class FleetDataService implements Serializable {

    private static final long serialVersionUID = 1L;

    private static final String JSON_PATH = "/WEB-INF/data/fleet-schedule.json";
    private final FleetConflictService conflictService = new FleetConflictService();
    private final ObjectMapper mapper;

    public FleetDataService() {
        this.mapper = new ObjectMapper();
        this.mapper.registerModule(new JavaTimeModule());
        this.mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        this.mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    /**
     * Carga el cronograma desde el archivo JSON externo, procesa los conflictos
     * y retorna el modelo FleetSchedule deserializado.
     */
    public FleetSchedule loadFleetSchedule() {
        try (InputStream is = obtainJsonInputStream()) {
            if (is == null) {
                System.err.println("No se encontro el archivo JSON en: " + JSON_PATH);
                return new FleetSchedule();
            }

            FleetSchedule schedule = mapper.readValue(is, FleetSchedule.class);
            conflictService.detectAndMarkConflicts(schedule.getTasks());
            return schedule;

        } catch (Exception e) {
            e.printStackTrace();
            return new FleetSchedule();
        }
    }

    /**
     * Retorna el cronograma procesado en formato String JSON para el componente JSF.
     */
    public String loadFleetScheduleAsJson() {
        try {
            FleetSchedule schedule = loadFleetSchedule();
            return mapper.writeValueAsString(schedule);
        } catch (Exception e) {
            e.printStackTrace();
            return "{\"resources\":[], \"tasks\":[]}";
        }
    }

    /**
     * Obtiene el InputStream tanto en tiempo de ejecucion web (JSF) como en pruebas unitarias.
     */
    private InputStream obtainJsonInputStream() {
        FacesContext facesContext = FacesContext.getCurrentInstance();
        if (facesContext != null) {
            ExternalContext ec = facesContext.getExternalContext();
            InputStream is = ec.getResourceAsStream(JSON_PATH);
            if (is != null) {
                return is;
            }
        }
        // Fallback por ClassLoader si se ejecuta fuera de contexto web
        return Thread.currentThread().getContextClassLoader().getResourceAsStream("fleet-schedule.json");
    }
}