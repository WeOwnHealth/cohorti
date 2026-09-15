// This file is part of WeOwnHealth/trials.
// SPDX-License-Identifier: Apache-2.0
// Shared test utilities.

export const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};
