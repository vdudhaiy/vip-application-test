import logging
import json
from typing import Callable


logger = logging.getLogger('app')


class RequestLoggingMiddleware:
    """Logs only the request and its data (query params + body preview).

    Avoids logging remote address, headers, or other unrelated metadata.
    """

    def __init__(self, get_response: Callable):
        self.get_response = get_response

    def __call__(self, request):
        try:
            method = request.method
            path = request.get_full_path()

            # Query params (simple dict of first values)
            try:
                query_params = request.GET.dict()
            except Exception:
                query_params = {}

            # Safe body preview and optional parsed JSON
            body_preview = ''
            parsed_body = None
            try:
                if hasattr(request, 'body') and request.body:
                    raw = request.body
                    if isinstance(raw, (bytes, bytearray)):
                        raw = raw.decode('utf-8', errors='replace')
                    body_preview = raw[:2000]
                    try:
                        parsed_body = json.loads(raw)
                    except Exception:
                        parsed_body = None
            except Exception:
                body_preview = '<unreadable>'

            data = {'query_params': query_params, 'body_preview': body_preview}
            if parsed_body is not None:
                data['body'] = parsed_body

            logger.info("Incoming request: %s %s data=%s", method, path, data)
        except Exception:
            logger.exception("Failed to log incoming request")

        response = self.get_response(request)
        return response
