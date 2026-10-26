import { Outlet } from "react-router-dom";
import { Konami } from "./components/Konami";

const App = () => {
  return (
    <div className="w-full min-w-[952px] bg-white text-black dark:bg-gray-900 dark:text-white transition-colors duration-300">
      <Konami>
          <Outlet />
      </Konami>
    </div>
  );
};
export default App
