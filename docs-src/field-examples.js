import '../field.js';

const handle = document.querySelector('#handle');
const customStatus = document.querySelector('#custom-status');
function validateHandle() {
  handle.setCustomValidity(
    handle.value.trim().toLowerCase() === 'admin'
      ? 'That handle is reserved. Choose another.'
      : ''
  );
}
handle.addEventListener('input', () => {
  validateHandle();
  customStatus.textContent = '';
});
validateHandle();
document.querySelector('#custom-form').addEventListener('submit', event => {
  event.preventDefault();
  customStatus.textContent = 'Handle is valid.';
});

const start = document.querySelector('#start');
const end = document.querySelector('#end');
const datesStatus = document.querySelector('#dates-status');
function validateDates() {
  end.setCustomValidity(
    start.value && end.value && end.value < start.value
      ? 'End date must be on or after the start date.'
      : ''
  );
}
end.addEventListener('input', () => {
  validateDates();
  datesStatus.textContent = '';
});
start.addEventListener('input', () => {
  validateDates();
  // Refresh an already displayed error on the dependent field.
  end.dispatchEvent(new Event('input', { bubbles: true }));
});
validateDates();
document.querySelector('#dates-form').addEventListener('submit', event => {
  event.preventDefault();
  datesStatus.textContent = 'Dates are valid.';
});

const form = document.querySelector('#server-form');
const email = document.querySelector('#email');
const save = document.querySelector('#save');
const status = document.querySelector('#server-status');
let revision = 0;
email.addEventListener('input', () => {
  ++revision;
  email.setCustomValidity('');
  status.textContent = '';
  // The user input event then bubbles to m-field, which clears its error UI.
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  const requestRevision = ++revision;
  const submitted = email.value;
  save.disabled = true;
  status.textContent = 'Saving…';
  try {
    // Replace this simulation with your application's request.
    const errors = await new Promise(resolve => setTimeout(() => resolve(
      submitted.toLowerCase() === 'taken@example.com'
        ? { email: 'This email is already in use.' }
        : {}
    ), 600));
    if (requestRevision !== revision) return;
    if (errors.email) {
      email.setCustomValidity(errors.email);
      status.textContent = 'Please correct the email field.';
      form.reportValidity(); // Show inline error and focus the first invalid field.
    } else {
      status.textContent = 'Email saved in this demo.';
    }
  } catch {
    if (requestRevision === revision) {
      status.textContent = 'Could not save. Please try again.';
    }
  } finally {
    save.disabled = false;
  }
});
