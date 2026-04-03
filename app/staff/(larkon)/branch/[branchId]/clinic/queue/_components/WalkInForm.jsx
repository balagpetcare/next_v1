"use client";

import { useState, useEffect } from "react";

export default function WalkInForm({ 
  branchId, 
  onSubmit, 
  onSearchPatients, 
  doctors, 
  services, 
  actioning 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [notes, setNotes] = useState("");
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await onSearchPatients(searchQuery);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (e) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setSelectedPet(null);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPatient || !selectedPet || !selectedDoctor || !selectedService) {
      alert("Please select patient, pet, doctor, and service");
      return;
    }
    onSubmit({
      patientId: selectedPatient.id,
      petId: selectedPet.id,
      doctorId: Number(selectedDoctor),
      serviceId: Number(selectedService),
      priorityTag: priority,
      notes: notes.trim() || undefined,
    });
  };

  const handleReset = () => {
    setSelectedPatient(null);
    setSelectedPet(null);
    setSelectedDoctor("");
    setSelectedService("");
    setPriority("NORMAL");
    setNotes("");
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <div className="row">
      <div className="col-md-6">
        <h6 className="mb-3">Patient Lookup</h6>
        
        {!selectedPatient ? (
          <>
            <div className="input-group mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, phone, or pet ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? "..." : "Search"}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="list-group mb-3">
                {searchResults.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    className="list-group-item list-group-item-action"
                    onClick={() => handleSelectPatient(patient)}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{patient.user?.profile?.displayName || "Unknown"}</strong>
                        <br />
                        <small className="text-muted">
                          {patient.user?.phone || "No phone"} • {patient.name} ({patient.species})
                        </small>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="card mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="mb-1">{selectedPatient.user?.profile?.displayName || "Unknown"}</h6>
                  <p className="text-muted mb-0 small">
                    {selectedPatient.user?.phone || "No phone"}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleReset}
                >
                  Change
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedPatient && (
          <>
            <h6 className="mb-3">Select Pet</h6>
            <div className="mb-3">
              <select
                className="form-select"
                value={selectedPet?.id || ""}
                onChange={(e) => {
                  const pet = selectedPatient.pets?.find((p) => p.id === Number(e.target.value));
                  setSelectedPet(pet || null);
                }}
              >
                <option value="">-- Select Pet --</option>
                {(selectedPatient.pets || []).map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name} ({pet.species}) - {pet.breed || "Unknown breed"}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      <div className="col-md-6">
        <form onSubmit={handleSubmit}>
          <h6 className="mb-3">Appointment Details</h6>

          <div className="mb-3">
            <label className="form-label">Doctor</label>
            <select
              className="form-select"
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              required
            >
              <option value="">-- Select Doctor --</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.user?.profile?.displayName || `Doctor ${doc.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Service</label>
            <select
              className="form-select"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              required
            >
              <option value="">-- Select Service --</option>
              {services.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Priority</label>
            <select
              className="form-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="NORMAL">Normal</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="FOLLOWUP">Follow-up</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Notes (optional)</label>
            <textarea
              className="form-control"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
            />
          </div>

          <div className="d-flex gap-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!selectedPatient || !selectedPet || !selectedDoctor || !selectedService || actioning}
            >
              {actioning ? "Creating..." : "Create Walk-In Ticket"}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
