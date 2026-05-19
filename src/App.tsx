import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CardWheelPage from "@/pages/CardWheelPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CardWheelPage />} />
        <Route path="/card-wheel" element={<CardWheelPage />} />
        <Route path="*" element={<CardWheelPage />} />
      </Routes>
    </Router>
  );
}
