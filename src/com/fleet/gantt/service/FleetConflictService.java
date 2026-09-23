package com.fleet.gantt.service;

import com.fleet.gantt.model.FleetTask;
import com.fleet.gantt.model.TaskDetails;

import java.io.Serializable;
import java.util.List;

public class FleetConflictService implements Serializable {

    private static final long serialVersionUID = 1L;

    public void detectAndMarkConflicts(List<FleetTask> tasks) {
        if (tasks == null || tasks.size() < 2) {
            return;
        }

        for (int i = 0; i < tasks.size(); i++) {
            FleetTask t1 = tasks.get(i);
            if ("cancelado".equalsIgnoreCase(t1.getStatus())) continue;

            for (int j = i + 1; j < tasks.size(); j++) {
                FleetTask t2 = tasks.get(j);
                if ("cancelado".equalsIgnoreCase(t2.getStatus())) continue;

                // 1. Solapamiento temporal
                boolean overlap = t1.getStart().isBefore(t2.getEnd()) && t2.getStart().isBefore(t1.getEnd());

                // 2. Colisión si comparten tractor, plataforma o conductor
                if (overlap && sharesAnyResource(t1.getDetails(), t2.getDetails())) {
                    t1.setHasConflict(true);
                    t2.setHasConflict(true);

                    if (!t1.getConflictingTaskIds().contains(t2.getId())) {
                        t1.getConflictingTaskIds().add(t2.getId());
                    }
                    if (!t2.getConflictingTaskIds().contains(t1.getId())) {
                        t2.getConflictingTaskIds().add(t1.getId());
                    }
                }
            }
        }
    }

    private boolean sharesAnyResource(TaskDetails d1, TaskDetails d2) {
        if (d1 == null || d2 == null) return false;

        if (d1.getTractor() != null && d1.getTractor().equals(d2.getTractor())) return true;
        if (d1.getPlataforma() != null && d1.getPlataforma().equals(d2.getPlataforma())) return true;
        if (d1.getConductor() != null && d1.getConductor().equals(d2.getConductor())) return true;

        return false;
    }
}