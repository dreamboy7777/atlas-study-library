import Foundation
import Network

/// Serves the bundled Atlas HTML over http://127.0.0.1 so WKWebView gets a
/// stable, secure origin for localStorage and IndexedDB.
final class LocalServer {
    private let html: Data
    private let queue = DispatchQueue(label: "com.atlas.study.server")
    private var listener: NWListener?
    private(set) var port: UInt16 = 0
    var onReady: ((UInt16) -> Void)?
    var onFailure: (() -> Void)?

    init(html: Data) {
        self.html = html
    }

    func start() {
        start(port: 8765, attempt: 0)
    }

    private func start(port: UInt16, attempt: Int) {
        guard attempt < 5, let nwPort = NWEndpoint.Port(rawValue: port) else {
            DispatchQueue.main.async { self.onFailure?() }
            return
        }
        do {
            let listener = try NWListener(using: .tcp, on: nwPort)
            self.listener = listener
            listener.stateUpdateHandler = { [weak self] state in
                guard let self = self else { return }
                switch state {
                case .ready:
                    self.port = port
                    DispatchQueue.main.async { self.onReady?(port) }
                case .failed:
                    self.listener?.cancel()
                    self.listener = nil
                    self.start(port: port + 1, attempt: attempt + 1)
                default:
                    break
                }
            }
            listener.newConnectionHandler = { [weak self] connection in
                self?.handle(connection)
            }
            listener.start(queue: queue)
        } catch {
            start(port: port + 1, attempt: attempt + 1)
        }
    }

    private func handle(_ connection: NWConnection) {
        connection.start(queue: queue)
        connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, _, error in
            guard let self = self else {
                connection.cancel()
                return
            }
            if error != nil {
                connection.cancel()
                return
            }
            let request = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
            let firstLine = request.components(separatedBy: "\r\n").first ?? ""
            let isGet = firstLine.hasPrefix("GET /")
            let body = isGet ? self.html : Data("Not found".utf8)
            let status = isGet ? "200 OK" : "404 Not Found"
            let header = "HTTP/1.1 \(status)\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: \(body.count)\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n"
            var response = Data(header.utf8)
            response.append(body)
            connection.send(content: response, completion: .contentProcessed { _ in
                connection.cancel()
            })
        }
    }

    func stop() {
        listener?.cancel()
        listener = nil
    }
}
