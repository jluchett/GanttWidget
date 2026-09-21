package com.fleet.gantt.service;

import com.fleet.gantt.model.FleetTask;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class FleetConflictService {

    /**
     * Analiza las tareas y marca aquellas que se solapan en el tiempo para el mismo recurso.
     */
    public void detectAndMarkConflicts(List<FleetTask> tasks) {
        // Agrupar tareas por recurso asignado
        Map<String, List<FleetTask>> tasksByResource = tasks.stream()
                .filter(t -> !"cancelado".equalsIgnoreCase(t.getStatus())) // Omitir canceladas
                .collect(Collectors.groupingBy(FleetTask::getResourceId));

        for (List<FleetTask> resourceTasks : tasksByResource.values()) {
            int n = resourceTasks.size();
            for (int i = 0; i < n; i++) {
                FleetTask t1 = resourceTasks.get(i);
                for (int j = i + 1; j < n; j++) {
                    FleetTask t2 = resourceTasks.get(j);

                    // Condición de solapamiento temporal
                    if (t1.getStart().isBefore(t2.getEnd()) && t2.getStart().isBefore(t1.getEnd())) {
                        t1.setHasConflict(true);
                        t1.getConflictingTaskIds().add(t2.getId());

                        t2.setHasConflict(true);
                        t2.getConflictingTaskIds().add(t1.getId());
                    }
                }
            }
        }
    }
}