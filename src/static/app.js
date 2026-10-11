document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activityName = name;
        activityCard.dataset.maxParticipants = details.max_participants;

        const spotsLeft = details.max_participants - details.participants.length;

        const heading = document.createElement("h4");
        heading.textContent = name;
        activityCard.appendChild(heading);

        const description = document.createElement("p");
        description.textContent = details.description;
        activityCard.appendChild(description);

        const schedule = document.createElement("p");
        const scheduleLabel = document.createElement("strong");
        scheduleLabel.textContent = "Schedule:";
        schedule.append(scheduleLabel, ` ${details.schedule}`);
        activityCard.appendChild(schedule);

        const availability = document.createElement("p");
        availability.className = "activity-availability";
        const availabilityLabel = document.createElement("strong");
        availabilityLabel.textContent = "Availability:";
        availability.append(availabilityLabel, ` ${spotsLeft} spots left`);
        activityCard.appendChild(availability);

        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";
        const participantsHeading = document.createElement("h5");
        participantsHeading.textContent = `Participants (${details.participants.length})`;
        participantsSection.appendChild(participantsHeading);

        const participantsList = document.createElement("ul");
        participantsList.className = "participant-list";
        renderParticipants(participantsList, details.participants);
        participantsSection.appendChild(participantsList);
        activityCard.appendChild(participantsSection);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function renderParticipants(participantsList, participants) {
    participantsList.replaceChildren();

    if (participants.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "participant-list-empty";
      emptyItem.textContent = "No participants yet";
      participantsList.appendChild(emptyItem);
      return;
    }

    participants.forEach((participant) => {
      const participantItem = document.createElement("li");
      participantItem.dataset.participant = participant;

      const participantName = document.createElement("span");
      participantName.className = "participant-email";
      participantName.textContent = participant;
      participantItem.appendChild(participantName);

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "participant-delete-button";
      deleteButton.setAttribute("aria-label", `Unregister ${participant}`);
      deleteButton.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" /></svg>';
      participantItem.appendChild(deleteButton);
      participantsList.appendChild(participantItem);
    });
  }

  function updateActivityCard(activity, participants) {
    const activityCard = Array.from(activitiesList.querySelectorAll(".activity-card")).find(
      (card) => card.dataset.activityName === activity
    );
    if (!activityCard) {
      return;
    }

    const participantsList = activityCard.querySelector(".participant-list");
    renderParticipants(participantsList, participants);
    const participantCount = participants.length;
    activityCard.querySelector(".participants-section h5").textContent =
      `Participants (${participantCount})`;

    const availability = activityCard.querySelector(".activity-availability");
    const availabilityLabel = availability.querySelector("strong");
    const spotsLeft = Number(activityCard.dataset.maxParticipants) - participantCount;
    availability.replaceChildren(availabilityLabel, ` ${spotsLeft} spots left`);
  }

  activitiesList.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const deleteButton = event.target.closest(".participant-delete-button");
    if (!deleteButton) {
      return;
    }

    const activityCard = deleteButton.closest(".activity-card");
    const participantItem = deleteButton.closest("li");
    const activity = activityCard.dataset.activityName;
    const email = participantItem.dataset.participant;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (response.ok) {
        const participants = Array.from(
          activityCard.querySelectorAll(".participant-list li[data-participant]")
        )
          .map((item) => item.dataset.participant)
          .filter((participant) => participant !== email);
        updateActivityCard(activity, participants);
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      console.error("Error unregistering participant:", error);
    }

    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        const activityCard = Array.from(activitiesList.querySelectorAll(".activity-card")).find(
          (card) => card.dataset.activityName === activity
        );
        const participants = Array.from(
          activityCard.querySelectorAll(".participant-list li[data-participant]")
        ).map((item) => item.dataset.participant);
        participants.push(email);
        updateActivityCard(activity, participants);
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
