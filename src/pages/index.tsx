import { Hono } from "hono";
import { trimTrailingSlash } from "hono/trailing-slash";
import accounts from "./accounts";
import auth from "./auth";
import home from "./home";
import login from "./login";
import profile from "./profile";
import setup from "./setup";

const page = new Hono();

page.use(trimTrailingSlash());
page.route("/", home);
page.route("/:handle{@[^/]+}", profile);
page.route("/login", login);
page.route("/setup", setup);
page.route("/auth", auth);
page.route("/accounts", accounts);

export default page;
