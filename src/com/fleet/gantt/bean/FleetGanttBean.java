package com.fleet.gantt.bean;

import com.fleet.gantt.service.FleetDataService;

import javax.annotation.PostConstruct;
import javax.faces.bean.ManagedBean;
import javax.faces.bean.ViewScoped;
import java.io.Serializable;

@SuppressWarnings("deprecation")
@ManagedBean(name = "fleetGanttBean")
@ViewScoped
public class FleetGanttBean implements Serializable {

    private static final long serialVersionUID = 1L;

    private String fleetScheduleJson;
    private final FleetDataService dataService = new FleetDataService();

    public FleetGanttBean() {
    }

    @PostConstruct
    public void init() {
        // Carga desacoplada a traves del servicio
        this.fleetScheduleJson = dataService.loadFleetScheduleAsJson();
    }

    public String getFleetScheduleJson() {
        return fleetScheduleJson;
    }
}