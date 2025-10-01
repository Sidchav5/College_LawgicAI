import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import HeroSection from "./components/HeroSection";
import Footer from "./components/Footer";
import Features from "./components/Features";
import Signup from "./components/Signup";
import Login from "./components/Login";
import Profile from "./components/Profile";
import AnalyseContract from "./components/AnalyseContract";
function App() {
  return (
    <Router>

      <Routes>
        <Route path="/" element={<><HeroSection /><Features /><Footer /></>} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/analyse" element={<AnalyseContract />} />
      </Routes>
    </Router>
  );
}

export default App;
