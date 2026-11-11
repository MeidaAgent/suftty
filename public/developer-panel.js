const addressForm = document.querySelector("#address-form");
const addressInput = document.querySelector("#ca-input");
const panelStatus = document.querySelector("#panel-status");
const logoutButton = document.querySelector("#logout-button");

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Permintaan gagal.");
  }
  return result;
}

async function loadCaAddress() {
  try {
    const result = await request("/api/admin/config");
    addressInput.value = result.caAddress || "";
  } catch (error) {
    panelStatus.textContent = error.message;
  }
}

addressForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  panelStatus.textContent = "Menyimpan...";

  try {
    await request("/api/admin/config", {
      method: "PUT",
      body: JSON.stringify({ caAddress: addressInput.value }),
    });
    panelStatus.textContent = "CA berhasil diperbarui.";
  } catch (error) {
    panelStatus.textContent = error.message;
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await request("/api/admin/logout", { method: "POST" });
    window.location.replace("/developer");
  } catch (error) {
    panelStatus.textContent = error.message;
  }
});

loadCaAddress();
