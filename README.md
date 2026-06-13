# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

# 🚚 Sistema de Gestión de Transporte

Plataforma web desarrollada en **React** con integración a **Firebase**, diseñada para la administración de clientes, viajes y asignación de choferes en tiempo real.

---

## 🚀 Tecnologías utilizadas

- React
- Firebase
  - Firestore (Base de datos)
  - Authentication (Login de usuarios)
- JavaScript (ES6+)
- CSS

---

## 📦 Funcionalidades principales

- Gestión de clientes
- Registro y edición de información de usuarios
- Creación y administración de viajes
- Asignación de choferes a traslados
- Cálculo de disponibilidad de conductores
- Manejo de presupuestos (real y facturado)
- Sistema de autenticación de usuarios

---

## 🔐 Autenticación

El sistema utiliza Firebase Authentication para el control de acceso de usuarios, permitiendo sesiones seguras dentro de la aplicación.

---

## 🗄️ Base de datos

La información se almacena en **Cloud Firestore**, organizada principalmente en la colección:

- `clients` → contiene la información de clientes, destinos y asignaciones

---

## 🧠 Arquitectura del sistema

- Frontend en React
- Backend serverless con Firebase
- Base de datos en tiempo real (Firestore)
- Autenticación integrada

---

## 📌 Estado del proyecto

✔ En desarrollo activo  
✔ Funcionalidad principal operativa  
✔ En proceso de mejora y escalabilidad  

---

## 👨‍💻 Autor

Desarrollado por Maria Marianela Alvarez  
