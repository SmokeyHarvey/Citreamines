import React from "react";
import DiamondMiner from "./components/DiamondMiner";
import { Web3ReactProviderWrapper } from "./contexts/Web3Context";

function App() {
  return (
    <Web3ReactProviderWrapper>
      <DiamondMiner />
    </Web3ReactProviderWrapper>
  );
}

export default App;
