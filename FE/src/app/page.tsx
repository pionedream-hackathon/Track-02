import Image from "next/image";
import SwapUI from "./components/SwapSection";

export default function Home() {
  return (
    <div className="h-screen flex items-center justify-center p-4">
      <SwapUI />
    </div>
  );
}
