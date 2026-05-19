import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CardWheelPage from "@/pages/CardWheelPage";
import MonopolyGame from "@/pages/MonopolyGame";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MonopolyGame />} />
        <Route path="/card-wheel" element={<CardWheelPage />} />
        <Route path="/monopoly" element={<MonopolyGame />} />
        <Route path="*" element={<MonopolyGame />} />
      </Routes>
    </Router>
  );
}
