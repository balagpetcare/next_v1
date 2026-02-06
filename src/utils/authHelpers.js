/**
 * Helper functions for authentication
 */

/**
 * Detects if input is email or phone number
 * @param {string} input - User input (email or phone)
 * @returns {object} - { type: 'email' | 'phone', normalized: string }
 */
export function detectAuthType(input) {
  if (!input || typeof input !== "string") {
    return { type: null, normalized: "" };
  }

  const trimmed = input.trim();

  // Email detection: contains @ and valid email pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailPattern.test(trimmed)) {
    return {
      type: "email",
      normalized: trimmed.toLowerCase(),
    };
  }

  // Phone detection: contains only digits (with optional + at start)
  // Remove all non-digit characters except +
  const phoneDigits = trimmed.replace(/[^\d+]/g, "");
  // Check if it looks like a phone number (at least 10 digits, max 15)
  const digitCount = phoneDigits.replace(/\+/g, "").length;
  if (digitCount >= 10 && digitCount <= 15) {
    // Normalize: remove all non-digit characters for consistent storage
    const normalized = phoneDigits.replace(/\D/g, "");
    return {
      type: "phone",
      normalized: normalized,
    };
  }

  // If it contains @ but doesn't match email pattern, still treat as email attempt
  if (trimmed.includes("@")) {
    return {
      type: "email",
      normalized: trimmed.toLowerCase(),
    };
  }

  // Default: if it has digits, treat as phone
  if (digitCount > 0) {
    const normalized = phoneDigits.replace(/\D/g, "");
    return {
      type: "phone",
      normalized: normalized,
    };
  }

  return { type: null, normalized: trimmed };
}

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, message: string }
 */
export function validatePassword(password) {
  if (!password || password.length < 4) {
    return {
      valid: false,
      message: "Password must be at least 4 characters long",
    };
  }
  return { valid: true, message: "" };
}

/**
 * Validates registration input
 * @param {object} data - { identifier, password, name }
 * @returns {object} - { valid: boolean, errors: object }
 */
export function validateRegistration(data) {
  const errors = {};
  const { identifier, password, name } = data;

  // Check identifier (email or phone)
  const authType = detectAuthType(identifier);
  if (!authType.type) {
    errors.identifier = "Please enter a valid email or phone number";
  }

  // Check password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.message;
  }

  // Name is optional but if provided, should not be empty
  if (name && name.trim().length === 0) {
    errors.name = "Name cannot be empty if provided";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    authType,
  };
}
