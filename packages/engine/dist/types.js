/**
 * Core types for the Quirkle game engine.
 * These types are fundamental to all game logic and are exported for use by frontend and backend.
 */
export var Color;
(function (Color) {
    Color["Red"] = "red";
    Color["Orange"] = "orange";
    Color["Yellow"] = "yellow";
    Color["Green"] = "green";
    Color["Blue"] = "blue";
    Color["Purple"] = "purple";
})(Color || (Color = {}));
export var Shape;
(function (Shape) {
    Shape["Circle"] = "circle";
    Shape["Square"] = "square";
    Shape["Diamond"] = "diamond";
    Shape["Star"] = "star";
    Shape["Clover"] = "clover";
    Shape["Cross"] = "cross";
})(Shape || (Shape = {}));
export var RuleFamily;
(function (RuleFamily) {
    RuleFamily["Single"] = "single";
    RuleFamily["SameColorDifferentShape"] = "sameColorDifferentShape";
    RuleFamily["SameShapeDifferentColor"] = "sameShapeDifferentColor";
})(RuleFamily || (RuleFamily = {}));
export var GamePhase;
(function (GamePhase) {
    GamePhase["Lobby"] = "lobby";
    GamePhase["WaitingForPlayers"] = "waiting_for_players";
    GamePhase["Starting"] = "starting";
    GamePhase["PlayerTurn"] = "player_turn";
    GamePhase["TileExchange"] = "tile_exchange";
    GamePhase["GameOver"] = "game_over";
})(GamePhase || (GamePhase = {}));
//# sourceMappingURL=types.js.map