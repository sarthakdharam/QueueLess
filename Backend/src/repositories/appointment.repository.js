import { AppDataSource } from "../config/data-source.js";
import { Appointment } from "../entities/Appointment.js";

export async function countOpenAppointmentsByTime({ clinicId, doctorId, dayStart, dayEnd, statuses }) {
  return AppDataSource.getRepository(Appointment).createQueryBuilder("a")
    .select("a.scheduled_at", "scheduled_at").addSelect("COUNT(*)", "count")
    .where("a.clinic_id = :clinicId AND a.doctor_id = :doctorId", { clinicId, doctorId })
    .andWhere("a.scheduled_at >= :dayStart AND a.scheduled_at < :dayEnd", { dayStart, dayEnd })
    .andWhere("a.status IN (:...statuses)", { statuses })
    .groupBy("a.scheduled_at").getRawMany();
}
