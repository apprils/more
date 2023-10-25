
import type { DataParams, GetOptions } from "./@types";
import { buildRequest, objToQs } from "./_helpers";

export default function get<T = unknown>(
  url: string|URL,
  data: string | DataParams = {},
  options: GetOptions = {}
) {

  if (typeof url === "string") {
    url = new URL(url)
  }

  if (data) {

    let qs = ""

    if (typeof data === "string") {
      qs = data
    }
    else if (Object.prototype.toString.apply(data) === "[object Object]") {
      qs = objToQs(data)
    }
    else {
      throw new Error("Data should be a String or an Object")
    }

    if (qs.length) {
      url.search = "?"
        + url.search.replace("?", "")
        + "&"
        + qs
    }
  }

  return buildRequest<T>(
    url,
    { ...options, method: "GET" },
    { ...options.headers },
    (request) => request.end()
  )

}

