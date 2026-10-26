import { useEffect, useState } from "react";

export default function ThemeToogle() {
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem("theme");

        if (savedTheme) return savedTheme;

        console.log(window.matchMedia("(prefers-color-scheme: dark)"))

        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    })

    useEffect(() => {
        const html = document.documentElement;

        if(theme == "dark") {
            html.classList.add("dark");
        } else {
            html.classList.remove("dark");
        }
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toogleTheme = () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
    }

    return (
        <button onClick={toogleTheme} className="absolute right-2 border border-1 border-gray-900 px-4 py-1 rounded-lg bg-white dark:bg-gray-700 dark:text-white">
            {theme === "light" ? <i className={`ml-2 mr-3 fas fa-moon`}></i> :<i className={`ml-2 mr-3 fas fa-sun`}></i>}
        </button>
    )
}