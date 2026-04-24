import PatientCard from "@/components/patient/PatientCard";
import SectionContainer from "@/components/patient/SectionContainer";
import { medicalRecords } from "@/services/patientMockData";

export default function PatientRecordsPage() {
  return (
    <SectionContainer
      title="Medical Records"
      description="Recent nursing notes and care updates."
    >
      <div className="space-y-3">
        {medicalRecords.map((record) => (
          <PatientCard key={record.id} title={record.nurseName} subtitle={record.date}>
            <p className="text-sm leading-6 text-slate-600">{record.content}</p>
          </PatientCard>
        ))}
      </div>
    </SectionContainer>
  );
}
