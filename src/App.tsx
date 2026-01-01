import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Individual from "./pages/Individual";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/individual" element={<Individual />} />
    </Routes>
  );
}
