module.exports = {
  purge: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      fontFamily: {
        sans: ["Archivo", "ui-sans-serif", "system-ui"],
      },
      textColor: {
        primary: "#212121",
        secondary: "#6a737d",
      },
      borderColor: {
        primary: "#e1e4e8",
        secondary: "#d1d5da",
      },
      backgroundColor: {
        primary: "#24292e",
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
