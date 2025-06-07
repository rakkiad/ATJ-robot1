"use client"; // ใช้ client-side rendering
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import "@/styles/login.css";

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<"login" | "register">("login");

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    passWord: '',
  });

  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === "register" && formData.passWord !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (step === "register") {
      try {
        const res = await fetch("http://localhost:5000/users/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Registration failed");

        alert("Register success");
        setStep("login");
      } catch (error: any) {
        alert(error.message);
      }
    } else {
      // LOGIN
      try {
        const res = await fetch("http://localhost:5000/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            passWord: formData.passWord,
          }),
        });

        const data = await res.json();
        console.log("Login response:", data);
        if (!res.ok) throw new Error(data.message || "Login failed");

        // ✅ แก้ตรงนี้ให้ใช้ tokenJWT แทน
        const token = data.tokenJWT;
        if (!token) throw new Error("No token received from server");
        localStorage.setItem("token", token);

        const userWithName = {
          ...data.user,
          name: `${data.user.firstName} ${data.user.lastName}`,
        };
        localStorage.setItem("user", JSON.stringify(userWithName));

        window.dispatchEvent(new Event("userChanged"));
        router.push("/home");
      } catch (error: any) {
        alert(error.message);
      }
    }

  };

  return (
    <div className="container-login">
      <div className="crad-login">
        <div className="form-box">
          <h2>{step === "register" ? "Register" : "Login"}</h2>

          <form onSubmit={handleSubmit}>
            {step === "register" && (
              <>
                <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} required />
                <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required />
                <input type="tel" name="phoneNumber" placeholder="Phone Number" value={formData.phoneNumber} onChange={handleChange} required />
              </>
            )}
            <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
            <input type="password" name="passWord" placeholder="Password" value={formData.passWord} onChange={handleChange} required />
            {step === "register" && (
              <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            )}
            <button type="submit">{step === "register" ? "Register" : "Login"}</button>
          </form>

          {step === "login" && (
            <>
              <p>
                Don’t have an account?{" "}
                <span className="toggle-link" onClick={() => setStep("register")}>Register here</span>
              </p>
              <p>
                <span className="toggle-link" onClick={() => router.push("/otp")}>Forgot password?</span>
              </p>
            </>
          )}
          {step === "register" && (
            <p>
              Already have an account?{" "}
              <span className="toggle-link" onClick={() => setStep("login")}>Login here</span>
            </p>
          )}
        </div>
        <div className="image-box">
          <h1>welcome ATJ robot</h1>
          <img src="/logomine1.png" alt="Login" />
        </div>
      </div>
    </div>
  );
}
