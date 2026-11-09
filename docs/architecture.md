# Project Architecture

## Layers

```mermaid
flowchart TB
  routes[HTTP routes] --> services[Services]
  services --> rules[Domain rules]
  services --> repositories[Repositories]
  repositories --> data[(Data store)]

stateDiagram-v2
  [*] --> pending
  pending --> paid
  pending --> cancelled
  paid --> checked_in
  paid --> refunded
  paid --> cancelled
  cancelled --> [*]
  refunded --> [*]
  checked_in --> [*]

