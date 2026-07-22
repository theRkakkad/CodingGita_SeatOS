const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  enrollmentNo: z.string().min(3, "Enrollment number is required"),
  email: z.string().email("Invalid email format").refine(e => e.toLowerCase().endsWith('@swaminarayanuniversity.ac.in'), "Only @swaminarayanuniversity.ac.in addresses are allowed"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

console.log("--- Testing Zod Validation ---");

// Test 1: Invalid Email Domain
const test1 = registerSchema.safeParse({
  name: "John",
  enrollmentNo: "12345",
  email: "hacker@gmail.com",
  password: "password123"
});
console.log("Test 1 Result:", test1);

// Test 2: Valid Email Domain
const test2 = registerSchema.safeParse({
  name: "John",
  enrollmentNo: "12345",
  email: "student@swaminarayanuniversity.ac.in",
  password: "password123"
});
console.log("Test 2 Result:", test2);

// Test 3: Missing Fields
const test3 = registerSchema.safeParse({});
console.log("Test 3 (Missing fields):", test3.success ? "Passed (BAD)" : `Failed as expected -> ${test3.error.issues[0].message}`);
