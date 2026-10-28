const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Roles: 1 Employee, 2 Manager, 3 Admin. Access: 1 View, 2 Download, 3 Edit.
describe("blockapp", () => {
  async function setup() {
    const [admin, alice, bob, carol] = await ethers.getSigners();
    const v = await (await ethers.getContractFactory("blockapp")).deploy();
    await v.registerUser(alice.address, "Alice", "Finance", 1);
    await v.registerUser(bob.address, "Bob", "HR", 2);
    await v.registerUser(carol.address, "Carol", "Legal", 1);
    const input = {
      name: "report.pdf", fileType: "application/pdf", category: "Report",
      cid: "QmTest", fileHash: ethers.id("content"), size: 2048, wrappedKey: "0x1234",
    };
    return { v, admin, alice, bob, carol, input };
  }

  it("only an admin can add members, change roles and departments", async () => {
    const { v, alice, bob, carol } = await loadFixture(setup);
    await expect(v.connect(alice).registerUser(carol.address, "C", "X", 1)).to.be.revertedWith("Admin only");
    await v.updateRole(alice.address, 2);
    await v.updateDepartment(alice.address, "Legal");
    const u = await v.getUser(alice.address);
    expect(u.role).to.equal(2);
    expect(u.department).to.equal("Legal");
    await expect(v.connect(bob).updateRole(alice.address, 1)).to.be.revertedWith("Admin only");
  });

  it("there is no Auditor role", async () => {
    const { v, carol } = await loadFixture(setup);
    await expect(v.registerUser(carol.address, "C", "X", 4)).to.be.reverted;
  });

  it("owner uploads and has Edit access", async () => {
    const { v, alice, input } = await loadFixture(setup);
    await v.connect(alice).uploadFile(input);
    const mine = await v.connect(alice).getMyFiles();
    expect(mine.length).to.equal(1);
    expect(mine[0].level).to.equal(3);
    expect(mine[0].size).to.equal(2048);
  });

  it("people a file was not shared with cannot see it", async () => {
    const { v, alice, carol, input } = await loadFixture(setup);
    await v.connect(alice).uploadFile(input);
    expect((await v.connect(carol).getMyFiles()).length).to.equal(0);
    await expect(v.connect(carol).getVersions(1)).to.be.revertedWith("No access");
    await expect(v.connect(carol).getAccessList(1)).to.be.revertedWith("Only owner");
  });

  it("shares with several people in one transaction", async () => {
    const { v, alice, bob, carol, input } = await loadFixture(setup);
    await v.connect(alice).uploadFile(input);
    await v.connect(alice).shareWithMany(1, [bob.address, carol.address], 2, 0, ["0xaa", "0xbb"]);
    expect((await v.connect(bob).getMyFiles())[0].level).to.equal(2);
    expect((await v.connect(carol).getMyFiles())[0].level).to.equal(2);
    await expect(v.connect(bob).shareWithMany(1, [carol.address], 1, 0, ["0xaa"])).to.be.revertedWith("Only owner");
  });

  it("download is refused for view-only access", async () => {
    const { v, alice, bob, input } = await loadFixture(setup);
    await v.connect(alice).uploadFile(input);
    await v.connect(alice).shareWithMany(1, [bob.address], 1, 0, ["0xaa"]);
    await expect(v.connect(bob).recordAccess(1, 0)).to.not.be.reverted;
    await expect(v.connect(bob).recordAccess(1, 1)).to.be.revertedWith("Download not allowed");
  });

  it("revoking keeps a record so the person can ask again", async () => {
    const { v, alice, bob, input } = await loadFixture(setup);
    await v.connect(alice).uploadFile(input);
    await v.connect(alice).shareWithMany(1, [bob.address], 2, 0, ["0xaa"]);
    await v.connect(alice).revokeAccess(1, bob.address);
    const mine = await v.connect(bob).getMyFiles();
    expect(mine[0].level).to.equal(0);
    expect(mine[0].revoked).to.equal(true);
    await expect(v.connect(bob).requestAccess(1, 1, "again")).to.not.be.reverted;
  });

  it("requests: only for files shared with you, accepted requests upgrade access", async () => {
    const { v, alice, bob, carol, input } = await loadFixture(setup);
    await v.connect(alice).uploadFile(input);
    await expect(v.connect(carol).requestAccess(1, 1, "x")).to.be.revertedWith("Not shared with you");
    await v.connect(alice).shareWithMany(1, [bob.address], 1, 0, ["0xaa"]);
    await expect(v.connect(bob).requestAccess(1, 1, "x")).to.be.revertedWith("You already have this access");
    await v.connect(bob).requestAccess(1, 2, "need to download");
    await expect(v.connect(bob).requestAccess(1, 3, "y")).to.be.revertedWith("Request already pending");
    const reqs = await v.connect(alice).getMyRequests();
    expect(reqs[0].fromLevel).to.equal(1);
    expect(reqs[0].level).to.equal(2);
    await v.connect(alice).resolveRequest(0, true, 0, "0xabcd");
    expect((await v.connect(bob).getMyFiles())[0].level).to.equal(2);
  });

  it("a rejected request can be made again", async () => {
    const { v, alice, bob, input } = await loadFixture(setup);
    await v.connect(alice).uploadFile(input);
    await v.connect(alice).shareWithMany(1, [bob.address], 1, 0, ["0xaa"]);
    await v.connect(bob).requestAccess(1, 2, "x");
    await v.connect(alice).resolveRequest(0, false, 0, "0x");
    await expect(v.connect(bob).requestAccess(1, 2, "please")).to.not.be.reverted;
  });

  it("delete from me keeps the receiver's access", async () => {
    const { v, alice, bob, input } = await loadFixture(setup);
    await v.connect(alice).uploadFile(input);
    await v.connect(alice).shareWithMany(1, [bob.address], 2, 0, ["0xaa"]);
    await v.connect(alice).hideFile(1);
    expect((await v.connect(alice).getMyFiles()).length).to.equal(0);
    expect((await v.connect(bob).getMyFiles())[0].level).to.equal(2);
  });

  it("delete for everyone: receivers see it as deleted and lose access", async () => {
    const { v, alice, bob, input } = await loadFixture(setup);
    await v.connect(alice).uploadFile(input);
    await v.connect(alice).shareWithMany(1, [bob.address], 2, 0, ["0xaa"]);
    await expect(v.connect(bob).deleteForEveryone(1)).to.be.revertedWith("Only owner");
    await v.connect(alice).deleteForEveryone(1);
    const mine = await v.connect(bob).getMyFiles();
    expect(mine[0].isActive).to.equal(false);
    expect(mine[0].level).to.equal(0);
    expect((await v.connect(alice).getMyFiles()).length).to.equal(0);
  });

  it("access expires", async () => {
    const { v, alice, bob, input } = await loadFixture(setup);
    await v.connect(alice).uploadFile(input);
    const expiry = (await time.latest()) + 3600;
    await v.connect(alice).shareWithMany(1, [bob.address], 1, expiry, ["0xaa"]);
    expect((await v.connect(bob).getMyFiles())[0].level).to.equal(1);
    await time.increase(7200);
    expect((await v.connect(bob).getMyFiles())[0].level).to.equal(0);
  });

  it("new versions append and update the size", async () => {
    const { v, alice, input } = await loadFixture(setup);
    await v.connect(alice).uploadFile(input);
    await v.connect(alice).addVersion(1, "QmV2", ethers.id("v2"), 4096);
    expect((await v.connect(alice).getVersions(1)).length).to.equal(2);
    expect((await v.connect(alice).getMyFiles())[0].size).to.equal(4096);
  });

    it("verifyFile compares the submitted fingerprint with the recorded one", async () => {
    const { v, alice, carol, input } = await loadFixture(setup);
    await v.connect(alice).uploadFile(input);
    await expect(v.connect(alice).verifyFile(1, ethers.id("content")))
      .to.emit(v, "FileVerified").withArgs(1, alice.address, 1, true, ethers.id("content"));
    await expect(v.connect(alice).verifyFile(1, ethers.id("changed")))
      .to.emit(v, "FileVerified").withArgs(1, alice.address, 1, false, ethers.id("changed"));
    await expect(v.connect(carol).verifyFile(1, ethers.id("content"))).to.be.revertedWith("No access");
  });
});