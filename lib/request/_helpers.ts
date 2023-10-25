
import type { ClientRequest, IncomingMessage } from "http";
import { validateHeaderName, validateHeaderValue } from "http";

import { stringify } from "qs";

import type { RedirectableRequest } from "follow-redirects";
import { http, https } from "follow-redirects";

import type { DataParams, BuildRequestOptions } from "./@types";

type Request = RedirectableRequest<ClientRequest, any>
type ResponseHandler = (res: IncomingMessage) => void

export function objToQs(obj: DataParams): string {
  return stringify(obj, {
    arrayFormat: "brackets",
    encodeValuesOnly: true,
    skipNulls: true,
  })
}


export function stringifyData(
  request: Request,
  data: string | DataParams,
): string {

  if (typeof data === "string") {
    return data
  }

  const contentType = request.getHeader("Content-Type")

  return typeof contentType === "string" && /json/i.test(contentType)
    ? JSON.stringify(data)
    : objToQs(data)

}


export function buildRequest<T>(
  url: string|URL,
  options: BuildRequestOptions,
  headers: { [key: string]: string },
  requestAdjuster?: (request: Request) => void,
): Promise<{ data: T, response: IncomingMessage }> {

  return promiseWithTimeout(

    new Promise(function(resolve, _reject) {

      const reject = function(error: Error) {

        try {
          request.destroy()
        } catch(e) {}

        return _reject(error)

      }

      url = new URL(url)

      const _responseHandler = options.binary
        ? binaryResponseHandler
        : responseHandler

      const request = /https/i.test(url.protocol)
        ? https.request(url, options, _responseHandler(options, resolve, reject))
        : http.request(url, options, _responseHandler(options, resolve, reject))

      if (options.timeout) {
        request.setTimeout(options.timeout, function() {
          reject(new Error("Request timed out"))
        })
      }

      request.on("error", reject)

      const headerEntries: [ k: string, v: string ][] = Object.entries(headers || {})

      for (let [ key, val ] of headerEntries) {
        validateHeaderName(key)
        validateHeaderValue(key, val)
        request.setHeader(key, val)
      }

      if (requestAdjuster) {
        requestAdjuster(request)
      }

    }),

    options.timeout
      ? options.timeout + 1_000 // giving 1 more second for processing data etc.
      : 60_000 // giving 60s by default
  )

}


function binaryResponseHandler(
  options: BuildRequestOptions,
  resolve: Function,
  reject: Function,
): ResponseHandler {
  return function $binaryResponseHandler(response) {

    const data: any[] = []

    response.setEncoding("binary")

    response.on("error", (error) => {
      reject(errorHandler(error, { response }))
    })

    response.on("data", (chunk) => {
      data.push(Buffer.from(chunk, "binary"));
    })

    response.on("end", () => {

      if (!response.statusCode || (response.statusCode / 100 | 0) !== 2) {
        return reject(errorHandler(new Error, { response }));
      }

      resolve({ data: Buffer.concat(data), response })

    })

  }

}


function responseHandler(
  options: BuildRequestOptions,
  resolve: Function,
  reject: Function,
): ResponseHandler {
  return function $responseHandler(response) {

    let data = ""

    response.setEncoding("utf8")

    response.on("error", function(error) {
      reject(errorHandler(error, { data, response }))
    })

    response.on("data", function(chunk) {
      data += chunk
    })

    response.on("end", function() {

      if (!response.statusCode || (response.statusCode / 100 | 0) !== 2) {
        return reject(errorHandler(new Error, { data, response }));
      }

      if (options?.json && data) {
        try {
          data = JSON.parse(data)
        }
        catch (error: any) {
          Object.assign(error, { data, response })
          return reject(error)
        }
      }

      resolve({ data, response })

    })

  }

}


function errorHandler(
  error: Error,
  { data, response }: { data?: any, response: IncomingMessage },
) {

  let { message } = error

  if (!message) {

    if (data) {

      try {
        const json = JSON.parse(data)
        message = json.error || json
      }
      catch (e) {}

      if (!message) {
        message = data
      }
    }

    if (response && !message) {
      message = `${ response.statusCode }: ${ response.statusMessage }`
    }
  }

  if (!message) {
    message = "Request Failed"
  }

  if (
    [
      "[object Object]",
      "[object Array]",
    ].includes(Object.prototype.toString.apply(message))
  ) {
    message = JSON.stringify(message)
  }

  Object.assign(error, { message, data, response })

  return error

}


export function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  failureMessage?: string,
) {

  let timeoutHandle: NodeJS.Timeout

  const timeoutPromise = new Promise<never>(function(_, reject) {
    timeoutHandle = setTimeout(function() {
      reject(new Error(failureMessage || `Timeout reached - ${ timeoutMs }ms`))
    }, timeoutMs)
  })

  return Promise.race([
    promise,
    timeoutPromise,
  ]).finally(() => clearTimeout(timeoutHandle))

}

