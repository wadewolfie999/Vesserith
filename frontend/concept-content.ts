// Ported from the verified Nightpath learning illustration; no learner state.
export const CONCEPT_VIEWS = {
    lab: {
      label: "Python lab",
      description: "One Python program manages an MCP client and a local stdio connection to the server. No AI model is needed for this example.",
      summary: "Textual map: Python program contains the MCP client. The client communicates over a local stdio transport with the MCP server. The server exposes the add tool, which dispatches to an ordinary Python function. External data is optional and unused here.",
    },
    host: {
      label: "AI host",
      description: "An AI host manages its MCP client and model interaction, makes tools available, applies policy or approval, dispatches the call, and returns the result to the model.",
      summary: "AI host application contains its MCP client. A separate model interacts with the host, never directly with the MCP server. Client ↔ stdio ↔ server → registered add tool → Python function. Optional data is unused. A model can be local or remote; it need not run inside the host process.",
    },
  } as const;
export const CONCEPT_PARTICIPANTS = {
    application: {
      lab: {
        label: "Python program",
        what: "The calling application that starts and coordinates the local exercise.",
        owns: "The program flow, the client instance, the connection lifecycle, and what happens with the final result.",
        role: "It starts the server process through the stdio setup, asks its client to discover and call add, prints or checks 5, and closes cleanly. It needs no AI model.",
      },
      host: {
        label: "AI host application",
        what: "The user-facing application coordinating a model and one or more MCP clients.",
        owns: "User experience, client lifecycle, tool availability, policy or approval, model interaction, and delivery of results back to the model.",
        role: "It can let the model request add, decide whether the call may proceed, dispatch through its client, and return 5 to the model.",
      },
    },
    model: {
      host: {
        label: "Model",
        what: "The reasoning component used by the AI host.",
        owns: "Its generated requests and responses—not the MCP connection, server policy, or tool implementation.",
        role: "It may propose an add call and later use the returned 5. The host remains responsible for exposing and dispatching the tool.",
      },
    },
    client: {
      lab: {
        label: "MCP client",
        what: "A protocol participant inside the calling Python program.",
        owns: "Its MCP session, requests, response matching, and its side of capability negotiation.",
        role: "It initializes the session, discovers add, sends the call with 2 and 3, receives 5, and closes the session.",
      },
      host: {
        label: "MCP client",
        what: "A protocol participant managed inside the AI host application.",
        owns: "Its MCP session, requests, response matching, and its side of capability negotiation.",
        role: "It turns the host’s tool workflow into MCP messages: initialize, discover add, invoke it, and receive 5.",
      },
    },
    transport: {
      lab: {
        label: "stdio transport",
        what: "The byte channel connecting this client and the local server through standard input and output.",
        owns: "Message delivery mechanics and connection lifetime—not tool meaning, authorization, or business logic.",
        role: "It carries MCP messages between the two local processes. Closing it ends this local connection.",
      },
      host: {
        label: "Transport",
        what: "The communication channel connecting the host-managed client to the server.",
        owns: "Message delivery mechanics and connection lifetime—not tool meaning, authorization, or business logic.",
        role: "For the same local rehearsal this can be stdio; a later deployment could deliberately choose another supported transport.",
      },
    },
    server: {
      lab: {
        label: "MCP server",
        what: "The program that publishes capabilities through the MCP protocol.",
        owns: "Its advertised capability surface, request validation, and dispatch into implementation code.",
        role: "It registers the add tool, describes its inputs, validates the call, and routes it to the Python function.",
      },
      host: {
        label: "MCP server",
        what: "The program that publishes capabilities to the host’s MCP client.",
        owns: "Its advertised capability surface, request validation, and dispatch into implementation code.",
        role: "It exposes add in exactly the same way; the AI host changes who calls it, not who owns the tool implementation.",
      },
    },
    tool: {
      lab: {
        label: "add tool",
        what: "A named MCP action with an input description and a result.",
        owns: "The public contract presented by this server: the name add, its arguments, and the boundary around invocation.",
        role: "Discovery reveals the tool and its numeric inputs; invocation with 2 and 3 crosses this boundary.",
      },
      host: {
        label: "add tool",
        what: "A named MCP action the host can make available to its model workflow.",
        owns: "The public contract presented by this server: the name add, its arguments, and the boundary around invocation.",
        role: "The host exposes this description to the model, then sends an approved invocation through its client.",
      },
    },
    function: {
      lab: {
        label: "Python function",
        what: "Ordinary implementation code behind the MCP-facing tool.",
        owns: "The arithmetic behavior: accepting two values and returning their sum.",
        role: "It computes 2 + 3 and returns 5. MCP provides the discoverable boundary around it.",
      },
      host: {
        label: "Python function",
        what: "Ordinary implementation code behind the MCP-facing tool.",
        owns: "The arithmetic behavior: accepting two values and returning their sum.",
        role: "It still computes 2 + 3 and returns 5; adding a model does not move this responsibility.",
      },
    },
    data: {
      lab: {
        label: "Optional data or service",
        what: "An underlying dependency that real implementation code may read or call.",
        owns: "Its own records, files, service behavior, and access rules.",
        role: "The arithmetic example needs none. This empty dependency is intentional, not a missing MCP component.",
      },
      host: {
        label: "Optional data or service",
        what: "An underlying dependency that real implementation code may read or call.",
        owns: "Its own records, files, service behavior, and access rules.",
        role: "The arithmetic example still needs none. A future research tool must define this boundary explicitly.",
      },
    },
  } as const;
export const CONCEPT_STEPS = [
    {
      title: "Start the server and establish transport",
      description: "The calling application starts the local server process and opens the stdio channel between its client and that server.",
      participants: ["application", "client", "transport", "server"], connections: ["spawn", "stdio"],
    },
    {
      title: "Initialize the session",
      description: "Client sends initialize → server replies with the agreed version and capabilities → client sends notifications/initialized. Only then do normal requests begin.",
      participants: ["client", "transport", "server"], connections: ["protocol"],
    },
    {
      title: "Discover the add tool",
      description: "The client asks what tools are available. The server returns add together with the description of its expected inputs.",
      participants: ["client", "transport", "server", "tool"], connections: ["protocol", "publish"],
    },
    {
      title: "Request add with 2 and 3",
      description: "The calling application asks its client to invoke add. The MCP request names the tool and carries the two input values.",
      participants: ["application", "model", "client", "transport", "tool"], connections: ["model-client", "protocol", "publish"],
    },
    {
      title: "Validate and dispatch",
      description: "The server validates the request against the tool contract, then dispatches the accepted inputs to the ordinary Python function.",
      participants: ["server", "tool", "function"], connections: ["publish", "dispatch"],
    },
    {
      title: "Return the result: 5",
      description: "The function returns 5. The server forms the tool result, and the client delivers it to the calling application—or back to the model through its host.",
      participants: ["function", "tool", "server", "transport", "client", "application", "model"], connections: ["dispatch", "protocol", "model-client"],
    },
    {
      title: "Close the local connection cleanly",
      description: "Close the server’s input stream and wait for its process to exit; the stdio context handles cleanup. There is no MCP shutdown request.",
      participants: ["application", "client", "transport", "server"], connections: ["stdio", "spawn"],
    },
  ] as const;
export const GRAPH_EDGES = {
    "host-client": { from: "application", to: "client", label: "coordinates", what: "Application → its own client", owns: "Program control, lifecycle, and dispatch decisions belong to the application.", role: "This is an internal call, not an MCP connection. In the AI view, the host checks policy before asking its client to call a tool." },
    protocol: { from: "client", to: "server", label: "stdio ↔", what: "Client ↔ MCP server across a stdio transport", owns: "JSON-RPC requests, responses, and notifications cross this boundary. The transport carries bytes; it does not decide what a tool may do.", role: "initialize, its response, notifications/initialized, tools/list, then tools/call. The result returns along the same connection." },
    publish: { from: "server", to: "tool", label: "exposes", what: "Server → registered capability", owns: "The server publishes a name, description, and input schema.", role: "Discovery makes add visible to the client; the schema describes its two numeric inputs." },
    dispatch: { from: "tool", to: "function", label: "dispatches", what: "Registered add tool → Python implementation", owns: "The server validates inputs and routes an accepted call to implementation code.", role: "The ordinary Python function evaluates 2 + 3. Its return value becomes part of an MCP tool result." },
    dependency: { from: "function", to: "data", label: "optional", what: "Implementation → optional dependency", owns: "Implementation code decides which data or service it needs and enforces the access boundary.", role: "add needs no external data, files, credentials, or network service. This dashed edge is an extension point, not an active call." },
    "model-host": { from: "model", to: "application", label: "proposes ↔ result", what: "Model ↔ host application", owns: "The host chooses which tool descriptions to offer, applies policy or approval, and returns results. Model interaction is not this MCP connection.", role: "The model can propose add(2, 3). The host coordinates execution through its client, then supplies 5 to the model." },
  } as const;
export const STEP_MESSAGES = ["open stdio", "initialize ↔", "tools/list ↔", "tools/call →", "stdio ↔", "result: 5 ←", "close stdio"] as const;
