# Domain-Driven Design (DDD) POC Assignment

## Project: Order Fulfillment & Delivery Scheduling System 

### 🧩 1. Problem Statement 

You are tasked with building a backend system for an e-commerce logistics platform that manages the lifecycle of customer orders from placement to delivery. 

The system should handle: 

            - Order creation 

            - Inventory validation 

            - Shipment scheduling 

            - Delivery tracking 

The goal is to design and implement this system using Domain-Driven Design (DDD) principles, focusing on clean domain modeling, separation of concerns, and maintainable architecture. 


### 🎯 2. Objectives 

By completing this project, you should be able to: 

            - Model a real-world domain using DDD concepts 

            - Identify and define Entities, Value Objects, and Aggregates 

            - Separate the system into Bounded Contexts 

            - Implement business logic inside the domain layer 

            - Structure a backend application using Node.js, TypeScript, and PostgreSQL 

            - Apply patterns like Repositories and Domain Events


### 🏗️ 3. Functional Requirements 

        3.1 Order Management 

                    - A customer can create an order with multiple items 

                    - Each item has a product ID and quantity 

                    - Orders have statuses (e.g., Created, Confirmed, Shipped, Delivered) 

        3.2 Inventory Check 

                    - Before confirming an order, inventory must be validated 

                    - If stock is insufficient, the order should not proceed 

        3.3 Shipment Scheduling 

                    - Once confirmed, the system schedules a shipment 

                    - Each shipment is assigned: 

                                -: Delivery date 

                                -: Delivery partner (mocked or static) 

        3.4 Delivery Tracking 

                    - Shipment progresses through statuses: 

                                -: Scheduled → Dispatched → In Transit → Delivered

### 🧠 4. Domain Expectations 

You are expected to discover and define: 

### 🧠 4.1 Core Domain Concepts 

                    - What are the main business objects? 

                    - Which ones have identity (Entities)? 

                    - Which ones are immutable (Value Objects)? 

### 🧠 4.2 Aggregates 

                    - Define clear aggregate boundaries 

                    - Ensure consistency rules are enforced within aggregates 

### 🧠 4.3 Bounded Contexts 

Break the system into logical domains such as: 

            - Order Management 

            - Inventory 

            - Shipping / Delivery 

        (Exact boundaries are up to you to decide) 

### 🧱 5. Technical Requirements 

        - Language: TypeScript 

        - Runtime: Node.js 

        - Database: PostgreSQL 

        - API: REST (basic endpoints are sufficient) 


### 📂 6. Expected Project Structure (High-Level) 

You are free to design your structure, but it should clearly separate: 

        - Domain Layer (business logic) 

        - Application Layer (use cases) 

        - Infrastructure Layer (DB, external services) 

 

### 🔄 7. Suggested Use Cases 

Implement APIs or services for: 

    1. Create Order 

    2. Validate & Confirm Order 

    3. Schedule Shipment 

    4. Update Delivery Status 

    5. Fetch Order Details 


### 📣 8. Domain Events (Optional but Recommended) 

Introduce events such as: 

    - OrderCreated 

    - OrderConfirmed 

    - ShipmentScheduled 

    - DeliveryCompleted 

### 🧪 9. Testing Expectations 

    - Write unit tests for domain logic 

    - Focus on business rules, not just API responses 

### 🧭 10. Hints & Guidance (Important) 

    🔹 Modeling 

        - Avoid putting business logic in controllers or services 

        - Think: “Where should this rule live in the domain?” 

    🔹 Entities vs Value Objects 

        - If something has identity and lifecycle → likely an Entity 

        - If it’s defined only by its attributes → likely a Value Object 

    🔹 Aggregates 

        - Ask: “What needs to be consistent together?” 

        - Avoid large aggregates with too many responsibilities 

    🔹 Bounded Contexts 

        - If terminology or rules differ, consider separating contexts 

        - Keep contexts loosely coupled 

    🔹 Repositories 

        - Think of repositories as a way to load/save aggregates 

        - Do NOT mix persistence logic into domain models 

    🔹 Events 

        - Use events to decouple processes 

        - Example: after order confirmation → trigger shipment 

    🔹 Database Design 

        - Do not design DB first → design domain first 

        - Then map domain models to tables 


### 🚫 11. What NOT to Do 

    - Do NOT use a single “God service” for all logic 

    - Do NOT put all logic in controllers 

    - Do NOT tightly couple modules 

    - Do NOT ignore domain modeling (this is the core of the assignment)


### ✅ 12. Deliverables 

    - Source code (GitHub repo) 

    - README explaining: 

            -: Domain design decisions 

            -: Bounded contexts 

            -: Key assumptions 

    - API endpoints (basic documentation) 

    - Sample test cases 


### 🏁 13. Success Criteria 

    A successful submission should: 

    - Clearly demonstrate DDD concepts 

    - Have clean separation of layers 

    - Contain meaningful domain models 

    - Be easy to understand and extend 


### 📌 14. Final Note 

Focus more on design and modeling than on building a feature-rich system. 
The goal is to demonstrate how you think about the domain, not just how much you can build. 