"""Exercise contributor setup in a relocated checkout without touching a device."""
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"


class SetupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="konvo setup ")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.wrapper = self.root / "another clone" / "wrapper"
        self.scripts = self.wrapper / "scripts"
        self.scripts.mkdir(parents=True)
        for name in ("install-dev.sh", "verify-ipa.py"):
            shutil.copy2(SCRIPTS / name, self.scripts / name)
        self.ipa = self.wrapper / "src-tauri/gen/apple/build/arm64/Konvo.ipa"
        self.make_ipa(self.ipa)
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.log = self.root / "commands.jsonl"
        self.env = dict(os.environ, PATH=str(self.bin) + os.pathsep + os.environ["PATH"],
                        SETUP_TEST_LOG=str(self.log))
        self.env.pop("KONVO_IPA", None)
        self.mock("sleep", "pass\n")
        self.mock("xcrun", """import json, os, sys
args = sys.argv[1:]
with open(os.environ['SETUP_TEST_LOG'], 'a') as log:
    log.write(json.dumps(args) + '\\n')
if args[:3] == ['devicectl', 'list', 'devices']:
    if not os.environ.get('SETUP_TEST_UNPAIRED'):
        print('Test iPhone TEST-UDID available (paired)')
if args[:4] == ['devicectl', 'device', 'install', 'app']:
    sys.exit(1 if os.environ.get('SETUP_TEST_INSTALL_FAIL') else 0)
""")

    def make_ipa(self, path):
        path.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(path, "w") as ipa:
            info = {"CFBundleIdentifier": "org.example.fork", "CFBundleExecutable": "Fork",
                    "CFBundleShortVersionString": "9.2.3", "CFBundleVersion": "456"}
            ipa.writestr("Payload/Fork.app/Info.plist", plistlib.dumps(info))
            ipa.writestr("Payload/Fork.app/Fork", b"a fixture, not a release binary")

    def mock(self, name, body):
        path = self.bin / name
        path.write_text("#!" + sys.executable + "\n" + body)
        path.chmod(0o755)

    def install(self, *args):
        return subprocess.run(["/bin/sh", str(self.scripts / "install-dev.sh"), *args],
                              cwd=self.root, env=self.env, capture_output=True, text=True,
                              timeout=15)

    def commands(self):
        return [json.loads(line) for line in self.log.read_text().splitlines()] if self.log.exists() else []

    def test_relocated_checkout_preserves_data_and_uses_ipa_bundle_id(self):
        result = self.install("TEST-UDID", "--keep")
        self.assertEqual(result.returncode, 0, result.stderr)
        commands = self.commands()
        self.assertFalse(any("uninstall" in cmd for cmd in commands))
        install = next(cmd for cmd in commands if "install" in cmd)
        self.assertEqual(Path(install[-1]).resolve(), self.ipa.resolve())
        self.assertEqual(commands[-1], ["devicectl", "device", "process", "launch",
                                       "--device", "TEST-UDID", "org.example.fork"])

    def test_override_ipa_and_reset_use_the_selected_bundle(self):
        alternate = self.root / "other export.ipa"
        self.make_ipa(alternate)
        self.env["KONVO_IPA"] = str(alternate)
        result = self.install("TEST-UDID")
        self.assertEqual(result.returncode, 0, result.stderr)
        commands = self.commands()
        self.assertEqual(next(cmd for cmd in commands if "uninstall" in cmd)[-1], "org.example.fork")
        self.assertEqual(next(cmd for cmd in commands if "install" in cmd)[-1], str(alternate))

    def test_bad_arguments_and_missing_ipa_never_touch_device(self):
        for args in ((), ("TEST-UDID", "--typo")):
            self.assertEqual(self.install(*args).returncode, 2)
        self.ipa.unlink()
        result = self.install("TEST-UDID", "--keep")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("IPA not found", result.stderr)
        self.assertEqual(self.commands(), [])

    def test_failed_install_retries_and_never_launches(self):
        self.env["SETUP_TEST_INSTALL_FAIL"] = "1"
        result = self.install("TEST-UDID", "--keep")
        self.assertNotEqual(result.returncode, 0)
        commands = self.commands()
        self.assertEqual(sum("install" in cmd for cmd in commands), 3)
        self.assertFalse(any("launch" in cmd for cmd in commands))

    def test_unavailable_device_is_not_modified(self):
        self.env["SETUP_TEST_UNPAIRED"] = "1"
        result = self.install("TEST-UDID")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Device did not become available", result.stderr)
        self.assertTrue(all(cmd[:3] == ["devicectl", "list", "devices"] for cmd in self.commands()))

    def test_verifier_explains_missing_python_dependency(self):
        env = dict(self.env)
        env.pop("PYTHONPATH", None)
        result = subprocess.run([sys.executable, "-S", str(self.scripts / "verify-ipa.py")],
                                cwd=self.root, env=env, capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 2)
        self.assertIn("Missing Brotli", result.stderr)
        self.assertIn("requirements.txt", result.stderr)

    def test_verifier_reads_relocated_checkout_and_configured_version(self):
        # Empty build artifacts make this fail the release checks, but it must
        # read our fixture and version rather than anything in the author's home.
        (self.wrapper / "src-tauri/tauri.conf.json").write_text(json.dumps({
            "version": "9.2.3", "bundle": {"iOS": {"bundleVersion": "456"}}}))
        dist = self.wrapper / "dist"
        dist.mkdir()
        (dist / "index.html").write_text("<html></html>")
        (dist / "proof.png").write_bytes(b"fixture")
        # No compression is exercised in this fixture; avoid needing pip to run tests.
        (self.bin / "brotli.py").write_text("")
        env = dict(self.env, PYTHONPATH=str(self.bin))
        result = subprocess.run([sys.executable, "-S", str(self.scripts / "verify-ipa.py")],
                                cwd=self.root, env=env, capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 1)
        self.assertIn("PASS Fork.app 9.2.3(456)", result.stdout)
        self.assertIn("RESULT:", result.stdout)
        self.assertNotIn("Traceback", result.stderr)


if __name__ == "__main__":
    unittest.main()
