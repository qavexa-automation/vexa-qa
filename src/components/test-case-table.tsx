"use client";

import { TEST_STATUSES, type TestCase } from "@/lib/model";

export default function TestCaseTable({
  tests,
  onEdit,
  onStatusChange,
}: {
  tests: TestCase[];
  onEdit: (test: TestCase) => void;
  onStatusChange: (id: string, status: TestCase["status"]) => void;
}) {
  return (
    <div className="test-table-scroll" role="region" aria-label="Test cases" tabIndex={0}>
      <table className="test-case-table">
        <thead>
          <tr>
            <th scope="col">Project Name</th>
            <th scope="col">Module</th>
            <th scope="col">Steps to Execute</th>
            <th scope="col">Expected Result</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((test) => (
            <tr key={test.id}>
              <th scope="row">
                <button
                  type="button"
                  className="test-project-link"
                  onClick={() => onEdit(test)}
                  aria-label={`Edit ${test.id}: ${test.title}`}
                >
                  <small>{test.id}</small>
                  <strong>{test.title}</strong>
                </button>
              </th>
              <td>{test.suite || "—"}</td>
              <td className="test-case-text">{test.steps}</td>
              <td className="test-case-text">{test.expected}</td>
              <td>
                <select
                  className={`test-inline-status ${test.status.toLowerCase().replace(" ", "-")}`}
                  aria-label={`Status for ${test.id}: ${test.title}`}
                  value={test.status}
                  onChange={(event) =>
                    onStatusChange(test.id, event.target.value as TestCase["status"])
                  }
                >
                  {TEST_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
