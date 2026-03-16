# From Incubation to Top‑Level Project: How Apache Gluten Graduated—and What It Means for Contributors

---

## Agenda

1. **Opening — Why This Talk Matters**
2. **The Problem: Spark's Performance Ceiling**
3. **The Genesis of Gluten — History & Motivation**
4. **Architecture Deep Dive — How Gluten Works**
5. **The Incubation Journey — Milestones, Numbers & Lessons**
6. **Graduation Day — What It Took to Become a TLP**
7. **Why Gluten? — Competitive Landscape & Positioning**
8. **Current Status — By the Numbers**
9. **Industry Adoption & Real-World Impact**
10. **Becoming a Committer — The Apache Way**
11. **Committer Criteria: Gluten vs. Spark vs. Velox**
12. **Roadmap — Three Big Bets for 2026**
13. **How You Can Contribute — Paths for Every Persona**
14. **Q & A**

---

## 1. Opening — Why This Talk Matters

> **What if you could make your Spark jobs 4× faster tomorrow—without changing a single line of code?**

That's not a sales pitch. That's Apache Gluten.

On February 18, 2026, the Apache Software Foundation announced that **Apache Gluten graduated from incubation and became a Top-Level Project (TLP)** — alongside Apache Polaris, signaling a new era for lakehouse-native performance.

**Why should you care?**

- **You're a Spark user?** Gluten can speed up your jobs 2–6× with zero code changes.
- **You're a contributor?** Gluten is at an inflection point — a newly graduated project actively growing its committer base. Right now, your contributions can have outsized impact.
- **You care about open data infrastructure?** Gluten represents a new model: native performance for the Spark ecosystem without vendor lock-in.

**This talk is three things:**

1. 🔧 **The technical story** — How Gluten works and why it's fast
2. 🌍 **The community story** — How we graduated in just 2 years (one of the fastest in ASF history)
3. 🚀 **The opportunity story** — Why now is the best time to get involved

Let's start with the problem.

---

## 2. The Problem: Spark's Performance Ceiling

### Spark Is the Default — But Not Free

| Metric | Value |
|--------|-------|
| Spark monthly downloads (Maven) | 30M+ |
| Companies using Spark in production | 1,000+ |
| Community contributors | 2,000+ |

Yet many teams hit a **CPU and cost wall**: clusters scale out, bills go up, SLAs barely move.

### The JVM Hits the Wall

If you've ever watched a Spark job crawl while your CPUs sit at 40% utilization, you've felt this pain. The JVM is brilliant for many things — but squeezing every cycle out of modern hardware isn't one of them.

- **Whole-Stage CodeGen** (Spark 2.0) gave ~2× — but gains plateaued after that
- Modern hardware (NVMe SSDs, 100G networks) shifted the bottleneck to **CPU efficiency**
- The JVM wasn't built for this: **GC pauses**, pointer-chasing memory layouts, and **zero access to SIMD** instructions
- Native engines like ClickHouse and Velox leave the JVM in the dust — **2× to 10× faster** on the same hardware

### The Trade-Off Dilemma

```
 ┌──────────────────────────────┐
 │        Apache Spark          │ ← Scalability, Ecosystem, APIs
 │   (JVM-based execution)      │
 ├──────────────────────────────┤
 │     Native SQL Engines       │ ← Raw Performance
 │  (Velox, ClickHouse, etc.)   │
 └──────────────────────────────┘
  
 Can we keep Spark's ecosystem and operational model, while running
 like a native engine — WITHOUT rewriting a single query?
```

**Apache Gluten is our "yes" to that question.**

---

## 3. The Genesis of Gluten — History & Motivation

### The Backstory: From Gazelle to Gluten

| Year | Event |
|------|-------|
| **2019–2020** | Intel develops **Gazelle** — a native vectorized engine for Spark as part of OAP (Optimized Analytics Package). Proved the concept: native execution *can* accelerate Spark. But maintaining a standalone engine was a dead end. |
| **2021** | Meta open-sources **Velox** — a reusable C++ vectorized execution library. Intel's team had a lightbulb moment: *What if we didn't build yet another engine? What if we glued this battle-tested native library to Spark?* |
| **2022 Q1** | Intel and Kyligence had a bet: *What if we built the glue?* They co-create **Gluten**. The vision: Make Spark fast without rewriting a single Spark job. |
| **2022 Jun** | Gluten unveiled at **Data+AI Summit 2022** — first public presentation to 5,000+ attendees. |
| **2022 H2** | BIGO, Meituan, Alibaba Cloud, NetEase, Baidu join as contributors. The community takes off. |
| **2023** | Rapid feature development. Production adoption at scale. Academic paper published: *"The Gluten Open-Source Software Project: Modernizing Java-based Query Engines for the Lakehouse Era"* (CDMS Workshop) |

### Why "Gluten"?

- **"Gluten"** = Latin for **"glue"**
- It glues Spark's distributed control flow to native engines' raw compute power
- No query rewrites. No migration. Just configure and accelerate.

> *"We didn't build another engine. We built the glue that makes every engine work with Spark."*

---

## 4. Architecture Deep Dive — How Gluten Works

### Design Philosophy

> *"Reuse Spark's control flow; offload compute-intensive data processing to native engines."*

### Architecture Diagram

```
 ┌───────────────────────────────────────────────────┐
 │                  Apache Spark                      │
 │           (Distributed Control Flow)               │
 │                                                    │
 │   Spark Physical Plan                              │
 │         │                                          │
 │         ▼                                          │
 │   ┌──────────────┐                                │
 │   │ Gluten Plugin │  ← Spark plugin (no code change)│
 │   │              │                                 │
 │   │ Plan → Substrait IR                            │
 │   │              │                                 │
 │   │   JNI Bridge │                                 │
 │   └──────┬───────┘                                 │
 │          │                                         │
 ├──────────┼─────────────────────────────────────────┤
 │          ▼          Native Side                    │
 │   ┌──────────────┐   ┌──────────────┐             │
 │   │    Velox      │   │  ClickHouse  │  ← Backends │
 │   │  (Meta C++)   │   │ (Kyligence)  │             │
 │   └──────────────┘   └──────────────┘             │
 │                                                    │
 │   Data Format: Apache Arrow ColumnarBatch          │
 └───────────────────────────────────────────────────┘
```

### Key Components

| Component | Role |
|-----------|------|
| **Query Plan Conversion** | Transforms Spark physical plan → Substrait plan |
| **Unified Memory Management** | Manages native off-heap memory allocation |
| **Columnar Shuffle** | Columnar exchange operator reusing Spark's shuffle service |
| **Fallback Mechanism** | ColumnarToRow / RowToColumnar for unsupported operators |
| **Metrics** | Native engine metrics displayed in Spark UI |
| **Shim Layer** | Multi-version Spark compatibility (3.2, 3.3, 3.4, 3.5) |

---

## 5. The Incubation Journey — Milestones, Numbers & Lessons

### From Experiment to Top‑Level Project

**Growth at a Glance:**
- **Stars:** ~200 → **1,500+** (7.5× growth)
- **Contributors:** 30+ → **70+** (2.3× growth)
- **Companies:** 2 founders → **10+ active organizations**
- **Releases:** 0 Apache releases → **5 ASF releases** following full Apache process

### Three Phases

```
 Phase 1                 Phase 2                    Phase 3
 PROTOTYPE & VALIDATION  COMMUNITY & PRODUCTION     GOVERNANCE & MATURITY
 (2022)                  (2023–2024)                (2025–2026)
 ─────────────────────── ────────────────────────── ──────────────────────
 • Gazelle learnings     • Multi-company adoption   • 5 Apache releases
 • First public talks    • First Apache release      • Diverse PMC
 • First 50 stars          (1.2.0, Sep 2024)         • GlutenCon 2025
 • 2 companies           • 200+ stars, 30+ contrib. • Graduated as TLP!
```

### Key Milestones with Numbers

| Date | Milestone | Key Numbers |
|------|-----------|-------------|
| **2022 Q1** | Project created by Intel & Kyligence | 2 founding organizations |
| **2022 Jun** | First public talk at Data+AI Summit | First 50 GitHub stars |
| **2022 H2** | Multi-company adoption begins | 5+ contributing companies |
| **Dec 2023** | Entered Apache Incubator | ~200 GitHub stars, 30+ contributors |
| **Sep 2024** | Release 1.2.0 | First official Apache release |
| **Dec 2024** | Release 1.2.1 | Stability improvements |
| **Jan 2025** | Release 1.3.0 | Spark 3.5 full support |
| **Jun 2025** | Release 1.4.0 | Performance milestone |
| **Oct 2025** | Release 1.5.0 | 1,000+ GitHub stars |
| **Nov 2025** | First GlutenCon | 80+ workshop attendees, 12 new contributors after |
| **Feb 18, 2026** | 🎓 **Graduated as Apache TLP** | 1,500+ stars, 70+ contributors, 6,000+ commits |

### Releases During Incubation

| Version | Date | Highlights |
|---------|------|------------|
| 1.2.0 | Sep 2024 | First Apache release; Velox & ClickHouse backends stable |
| 1.2.1 | Dec 2024 | Bug fixes, stability improvements |
| 1.3.0 | Jan 2025 | Full Spark 3.5 support, improved memory management, OOM issues dropped 70% |
| 1.4.0 | Jun 2025 | Extended operator coverage, performance tuning |
| 1.5.0 | Oct 2025 | Spark 4.0 preview support, native Delta write |

---

### 🎓 Lessons Learned — The Hard Parts

**Graduating in 2 years sounds fast — but it didn't feel fast while we were in it.**

#### Lesson 1: Governance Is Harder Than Code

Early on, 90% of contributions came from Intel. The ASF Incubator mentors were clear: *"You need a diverse PMC, or you won't graduate."*

Getting buy-in from Kyligence, Microsoft, IBM, and others required trust — and trust takes time. We learned to:
- Make **all** technical decisions public on the mailing list (even when Slack was faster)
- Rotate meeting times to accommodate Asia, Europe, and US time zones
- **Explicitly invite dissent**: "Does anyone disagree?" became a mantra

**Turning point**: When one company nominated an engineer from a different company as committer — that's when we knew we'd built a real community.

#### Lesson 2: Two Backends = Twice the Complexity

Supporting both **Velox** (Intel, Microsoft, Meta) and **ClickHouse** (Kyligence, Alibaba) backends seemed like a strength — but it nearly fractured the community with different performance profiles, operator coverage, and corporate priorities.

**What we did**: Created a **backend abstraction layer** so Spark integration code stayed unified. Backend-specific code lived in separate modules.

**What we'd do differently**: Start with one backend, stabilize, then add more.

#### Lesson 3: The Hardest Technical Decision — Memory Management

Spark's on-heap memory manager and Velox's off-heap allocator competed for the same RAM. We had three options:

1. **Let them fight** (status quo) → frequent OOMs
2. **Reserve fixed partitions** (60/40 split) → wastes memory
3. **Dynamic negotiation** → complex but optimal

We chose #3. It took 9 months to get right. **Worth it.** OOM issues dropped 70% after release 1.3.0.

#### Lesson 4: Conference Talks ≠ Contributors

We gave talks at Data+AI Summit, Netflix forums, academic workshops — and got lots of GitHub stars. But stars don't write code.

**What worked**: **GlutenCon 2025** — a community-run conference with hands-on workshops. We trained 80 people to build Gluten from source. Two months later, 12 new active contributors.

> *Lesson: Lower the activation energy. Don't just inspire — enable.*

#### Lesson 5: IP Compliance Is Not a "Nice-to-Have"

The week before our graduation vote, a potential trademark concern was flagged. We spent 72 hours researching and consulting ASF legal.

**Outcome**: Resolved quickly. But the stress was real.

> *Lesson: Do IP due diligence early. It's a blocker, not a cleanup task.*

---

## 6. Graduation Day — What It Took to Become a TLP

### ASF Graduation Requirements ✅

| Requirement | How Gluten Met It |
|------------|-------------------|
| **Diverse Community** | Contributors from 10+ companies (Intel, Kyligence, Microsoft, IBM, Meta, BIGO, Meituan, Alibaba, NetEase, Baidu, Google) |
| **Independent Governance** | No single company controls the PMC |
| **Regular Releases** | 5 releases in 2 years following Apache release process |
| **Transparent Decision Making** | All discussions on dev@gluten.apache.org mailing list |
| **License Compliance** | Apache License 2.0, clean IP |
| **Active PMC** | Regular PMC meetings, responsive to community |
| **OpenSSF Best Practices** | Achieved OpenSSF Best Practices badge |

### The Vote

- **Discussion thread**: `[DISCUSS] Graduate Apache Gluten as an ASF top level project`
- **Board resolution**: Approved on February 18, 2026
- **Co-graduated with**: Apache Polaris — signaling a new era for lakehouse-native performance

### 🏆 What Made Graduation Possible

1. **Mentor support**: Experienced ASF mentors guided us through governance rough patches
2. **Release discipline**: 5 releases in 2 years, each passing IP checks
3. **Transparent decision-making**: 100% of discussions on public mailing lists
4. **Company diversity**: No single company held more than 40% of committers

> *"Graduation is not just about code quality; it's about sustainable governance and a community that can survive leadership changes."*

---

## 7. Why Gluten? — Competitive Landscape & Positioning

### The Landscape at a Glance

| Solution | Performance | Spark Compatibility | Open Source | Deployment |
|----------|------------|---------------------|-------------|------------|
| **Vanilla Spark** | Baseline | 100% | ✅ Apache 2.0 | Anywhere |
| **Databricks Photon** | 3–6× faster | 100% | ❌ Proprietary | Databricks only |
| **Apache Gluten** | 2–6× faster | 95%+ | ✅ Apache 2.0 | Anywhere |
| **Rewrite in Velox/DuckDB** | 5–10× faster | 0% (full rewrite) | ✅ Open source | New stack |

### vs. Databricks Photon

| Dimension | Photon | Gluten |
|-----------|--------|--------|
| **Vendor lock-in** | Must use Databricks cloud | Run anywhere (on-prem, any cloud, hybrid) |
| **Cost model** | Pay Databricks markup on compute | Use your own infrastructure |
| **Customization** | Closed source — take it or leave it | Open source — fork, extend, contribute |
| **Community** | Databricks engineers | 10+ companies, 70+ contributors |

**Use Photon if**: You're all-in on Databricks and want zero config.
**Use Gluten if**: You want performance without vendor lock-in.

### vs. Spark Tungsten / Whole-Stage CodeGen

Tungsten (Spark 2.0+) was a huge leap — but it's still JVM bytecode.

| Limit | Why It Matters |
|-------|----------------|
| **No SIMD** | Modern CPUs process 8–16 values per instruction. JVM can't use this. |
| **GC pauses** | 10–100ms pauses at scale = wasted time |
| **Memory indirection** | Object headers, pointer chasing = cache misses |

**Gluten gets you out of the JVM for the hot path (compute) while keeping Spark's control flow (scheduling, shuffling).**

### vs. Using Velox or DuckDB Directly

Why not just rewrite your Spark jobs?

- **Migration cost**: Rewriting 1,000s of Spark jobs is prohibitively expensive
- **Spark ecosystem**: DataFrames, MLlib, Streaming, Delta/Iceberg integrations
- **Team skills**: Your team knows Spark. Retraining is costly.

> **Gluten's value**: Get 80% of the performance gain with 0% application rewrites.

### vs. Apache DataFusion (Rust-based)

| Dimension | DataFusion | Gluten |
|-----------|-----------|--------|
| **Maturity** | Growing (since 2019) | Production-proven (2022–2026) |
| **Backend** | Rust execution | Velox (C++, Meta-backed), ClickHouse |
| **Enterprise adoption** | Emerging | Microsoft, IBM, Intel shipping it |
| **Spark integration** | Limited | First-class |

**We're exploring DataFusion as a third backend** (2026 Roadmap). It's not "either/or" — it's "both."

### The Gluten Value Proposition

```
 ┌───────────────────────────────────────────────────────────┐
 │                                                           │
 │  ✅ Native performance (2–6× faster)                      │
 │  ✅ Zero application code changes                         │
 │  ✅ Apache 2.0 license (no vendor lock-in)                │
 │  ✅ Run anywhere (cloud, on-prem, hybrid)                 │
 │  ✅ Backed by 10+ companies                               │
 │  ✅ Production-proven (Microsoft Fabric, IBM watsonx)     │
 │                                                           │
 └───────────────────────────────────────────────────────────┘
```

> *Gluten is the middle path: Open-source, Spark-compatible native acceleration without rewriting your stack.*

---

## 8. Current Status — By the Numbers

### GitHub Repository Snapshot (March 2026)

| Metric | Value |
|--------|-------|
| ⭐ GitHub Stars | **1,500+** |
| 🔀 Total Commits | **6,000+** |
| 👥 Contributors | **70+** |
| 🏢 Contributing Companies | **10+** |
| 📦 Apache Releases | **5** |
| 🔧 Supported Spark Versions | 3.2, 3.3, 3.4, 3.5 |
| ⚙️ Native Backends | Velox, ClickHouse |

### Performance Benchmarks

#### TPC-DS 1TB (Gluten+Velox vs. Vanilla Spark)

| Metric | Value |
|--------|-------|
| **Average speedup** | **1.72×** |
| **Median speedup** | **1.77×** |
| **Peak speedup** (single query) | **5.48×** |
| Queries improved | **90 / 104** (87%) |
| Queries with 3×+ improvement | **15** |
| Queries with 2–3× improvement | **25** |
| Compute cost savings | **~42%** |

#### TPC-H (Velox Backend)

| Metric | Value |
|--------|-------|
| **Overall speedup** | **2.71×** |
| **Peak speedup** (single query) | **14.53×** |

#### Microsoft Fabric NEE (Gluten+Velox)

| Metric | Value |
|--------|-------|
| **TPC-DS 1TB speedup** | **~4×** |
| **Internal workload speedup** | **up to 6×** |

---

## 9. Industry Adoption & Real-World Impact

### Major Adopters

| Company | Usage |
|---------|-------|
| **Microsoft** | Fabric Native Execution Engine (Gluten+Velox) — GA since May 2025 |
| **IBM** | watsonx.data Spark acceleration engine |
| **Intel** | Core contributor, performance optimization on Xeon |
| **Kyligence** | Co-founder, enterprise analytics platform |
| **BIGO** | Production analytics workloads |
| **Meituan** | Large-scale data processing |
| **Alibaba Cloud** | Cloud-native Spark acceleration |
| **NetEase** | Data platform integration |
| **Baidu** | Big data analytics |
| **Google** | Contributing to project development |

### 🌟 Success Stories

#### Story 1: Microsoft Fabric — Native Execution Engine at Cloud Scale

**Context**: Microsoft Fabric powers analytics for millions of users. When they needed to accelerate Spark workloads, they chose Gluten+Velox as the foundation.

**Timeline**:
- Public Preview: June 2024 (Runtime 1.2)
- **General Availability: May 2025** (Runtime 1.3)

**Results**:
- **~4× speedup** on TPC-DS 1TB benchmarks
- **Up to 6×** on internal workloads
- Zero code changes required — enable via Spark configuration
- Available to **all Microsoft Fabric Spark users** globally

> Unlike Databricks' proprietary Photon engine, Fabric's NEE uses open-source Gluten and Velox — avoiding vendor lock-in and driving community innovation.

#### Story 2: IBM watsonx.data — Lakehouse Acceleration

**Context**: IBM's watsonx.data is a lakehouse platform combining Iceberg, Spark, and Presto for mixed workloads.

**Problem**: Spark jobs for ML feature engineering (nested data, complex joins) were slower than Presto on the same queries.

**Solution**: Integrated Gluten+Velox as an optional acceleration layer.

**Results**:
- **2.5× average speedup** on feature engineering jobs
- **4–5× speedup** on complex joins (TPC-DS Q95-style)
- 60% of watsonx.data customers enabled Gluten within 6 months of GA

#### Story 3: BIGO — Handling 100M+ Daily Active Users

**Context**: BIGO (live-streaming platform) processes analytics for 100M+ DAU: video quality metrics, user engagement, ad performance.

**Solution**: Deployed Gluten+ClickHouse backend (ClickHouse's strength: aggregation-heavy queries).

**Results**:
- **90% of queries**: 2–3× speedup
- **Aggregation queries**: Up to 8× speedup
- Engineers enabled Gluten with **3 lines of Spark config** — no code changes

### Conference Presence

| Event | Year | Talk |
|-------|------|------|
| Data+AI Summit | 2022 | Gluten Intro (Intel) |
| CDMS Workshop | 2023 | Academic Paper |
| Data Engineering Open Forum (Netflix) | 2025 | "Revolutionizing Data Processing Efficiency" |
| **GlutenCon** | 2025 | First dedicated community conference |
| Data+AI Summit | 2026 | Graduation celebration (upcoming) |

---

## 10. Becoming a Committer — The Apache Way

### Core Principles

```
 ┌─────────────────────────────────────────────────────────┐
 │                    The Apache Way                        │
 │                                                          │
 │  🌐 Openness        — All decisions are transparent      │
 │  🏅 Meritocracy     — Earned contributions, earned trust │
 │  🤝 Consensus       — Collaborative technical direction  │
 │  ❤️  Community > Code — People sustain projects           │
 │  🎭 Wear Many Hats  — User / Committer / PMC member     │
 │  🌍 Diversity       — No single company dominance        │
 │                                                          │
 └─────────────────────────────────────────────────────────┘
```

> *Here's the beautiful truth about Apache projects: you earn your seat at the table. No corporate ladder. No politics. Just consistent, quality contributions.*

### The Path to Committership

```
 Contributor  →  Regular Contributor  →  Committer  →  PMC Member
     │                  │                    │              │
  Submit PRs,     Sustained quality     Nominated by    Oversee
  file issues,    contributions over    existing PMC,   releases,
  review code     multiple months       voted in        governance
```

### What Counts as a "Contribution"?

| Type | Examples |
|------|----------|
| **Code** | Features, bug fixes, performance improvements |
| **Code Reviews** | Thoughtful PR reviews, design feedback |
| **Documentation** | User guides, architecture docs, blog posts |
| **Community** | Answering questions, mentoring newcomers |
| **Testing** | Bug reports, test improvements, CI/CD |
| **Advocacy** | Conference talks, articles, workshop facilitation |

### What "Success" Looks Like — A Contributor's Timeline

> *If you spend 3–6 months doing the activities below, you are very likely on a path to committership.*

- **Month 1–2**: Fix 3–5 "good first issues" or docs gaps. Join dev@, introduce yourself. Review at least 1 PR per week.
- **Month 3–4**: Own a small area: an operator, a backend feature, or a doc section. Drive 1 design discussion on the mailing list.
- **Month 5–6**: Be the "go-to" person for at least one topic. Help a newcomer land their first PR.

### The Nomination & Voting Process

1. **Build a track record** — Consistent, quality contributions (typically 3–6 months)
2. **Get nominated** — Existing committer/PMC member nominates you on private list
3. **PMC votes** — Three PMC members vote yes. Zero vetoes. That's it.
4. **Sign ICLA** — Your name goes on the Gluten committers page forever.
5. **Welcome aboard!** 🎉

> *Pro tip: Don't wait to be asked. After 2–3 months of contributions, it's fine to express interest: "I'd love to become a committer. What would you like to see from me?"*

---

## 11. Committer Criteria: Gluten vs. Spark vs. Velox

### Comparison Table

| Dimension | Apache Gluten | Apache Spark | Velox (Meta) |
|-----------|--------------|--------------|--------------|
| **Governance** | Apache PMC model | Apache PMC model | Meta-led technical governance |
| **Nomination** | PMC vote (3+ binding "+1") | PMC vote (3+ binding "+1") | Merit-based, component maintainers |
| **Code Contributions** | PRs, bug fixes, new features | Major patches, component ownership | PRs, design discussions |
| **Non-Code** | Reviews, docs, community, advocacy | Reviews, docs, mentoring | Reviews, documentation |
| **Time Commitment** | Typically 3–6 months active | Long-term sustained contributions | Ongoing, component-focused |
| **Company Independence** | Required — diverse community | Required — diverse PMC | Merit-based but Meta controls commit access |
| **Key Differentiator** | Growing project — great opportunity | Mature project — deep expertise needed | Open governance, closed merge process |
| **Special Focus** | Native engine integration, Substrait, JNI, multi-backend | Catalyst optimizer, AQE, DataFrame API | Vectorized execution, memory mgmt, expression eval |

### 🔑 Key Insight for Contributors

> **Apache Gluten is at a unique inflection point.** As a newly graduated TLP, it is still actively growing its committer base. This means:
> - Lower barrier to entry compared to mature projects like Spark
> - More opportunities to make impactful contributions
> - Contributions to Gluten also strengthen your profile in the Spark and Velox ecosystems
> - Cross-project contributions (Gluten ↔ Spark ↔ Velox) are highly valued

### How Gluten Contributions Help Across Ecosystems

```
                    ┌──────────────┐
                    │ Apache Spark │
                    │  (Upstream)  │
                    └──────┬───────┘
                           │ Spark integration expertise
                    ┌──────┴───────┐
                    │ Apache Gluten│ ← You are here!
                    │  (Middle)    │
                    └──────┬───────┘
                           │ Native engine expertise
                    ┌──────┴───────┐
                    │    Velox     │
                    │ (Downstream) │
                    └──────────────┘
```

---

## 12. Roadmap — Three Big Bets for 2026

### Big Bet 1: 🚀 Run Anywhere Spark Runs (Platform & Version Coverage)

> *Imagine using Gluten on Spark 4.0, on any cloud, on ARM machines. That's where we're headed.*

| Initiative | Description |
|-----------|-------------|
| **Spark 4.0 Full Support** | First-class support for the next major Spark release |
| **PySpark & Arrow UDF** | Native support for Python UDFs — broadening the audience |
| **Full Datalake Support** | Extended JSON, Iceberg, Hudi, Delta format support |
| **GPU / FPGA / ARM** | Heterogeneous hardware accelerator support |

### Big Bet 2: ⚡ Make Native the Default (Performance & Hardware)

> *Right now, one Spark task = one CPU core. Imagine using all 32 cores on a machine per task. That's the future we're building.*

| Initiative | Description |
|-----------|-------------|
| **Multi-Core per Task** | Native parallelism within Spark executors |
| **Spill Optimization** | Better off-heap spill strategies for memory-intensive workloads |
| **Hash Table Broadcast** | Optimized broadcast join via native hash tables |
| **Dictionary Shuffle** | Compressed shuffle for dictionary-encoded columns |

### Big Bet 3: 📊 Delight Operators and Developers (Observability & UX)

> *Great performance means nothing if you can't debug it.*

| Initiative | Description |
|-----------|-------------|
| **Query Trace** | Enhanced diagnostics and execution tracing |
| **ANSI SQL Coverage** | Broader ANSI SQL feature compliance |
| **Complex Types** | Better support for nested/complex data types |
| **Scan Pushdown** | Filter/projection pushdown into remote storage |
| **Stage-level Resource Mgmt** | Resolving on-heap vs. off-heap memory conflicts |

### Horizon: Gluten Beyond Spark

| Initiative | Description |
|-----------|-------------|
| **Gluten + Flink + Velox** | Proof-of-concept for Flink integration |
| **DataFusion Backend** | Rust-based execution? We're exploring it. Gluten users get a third choice — and DataFusion gets Spark compatibility. |

### Release Plan (Tentative)

| Quarter | Version | Highlights |
|---------|---------|------------|
| Q1 2026 | 1.6.0 | Post-graduation cleanup, Spark 4.0 beta |
| Q2 2026 | 1.7.0 | Multi-core execution, PySpark UDF support |
| Q3 2026 | 1.8.0 | Flink PoC, GPU backend exploration |
| Q4 2026 | 2.0.0 | Major release — Spark 4.0 GA support, new backends |

### Where We Need You

> *If you want to be a committer in 2026, pick one of these bets and become the person everyone pings about it.*

- **Language folks:** PySpark UDFs via Arrow, docs, tutorials.
- **Engine hackers:** New backends, GPU/ARM experiments, complex types.
- **Operators & users:** Benchmarks, bug reports, production feedback.

---

## 13. How You Can Contribute — Paths for Every Persona

> *The beautiful thing about Apache projects: There's no single path. Whether you're a C++ wizard, a Spark architect, a data engineer, or a docs writer — there's a place for you.*

### 🎯 Contribution Paths by Persona

#### Persona 1: Backend C++ Developer (Velox / Native Engine Expert)

**You know**: C++17, vectorized execution, memory management, Arrow format
**You want**: Deep systems work, performance optimization

| Task | Difficulty | Impact |
|------|-----------|--------|
| Fix vectorized operator bugs in Velox backend | 🔴 Advanced | High |
| Implement missing TPC-DS operators (ROLLUP, CUBE) | 🔴 Advanced | High |
| Optimize hash join spill behavior | 🔴 Advanced | Very High |
| Benchmark and profile Gluten vs. vanilla Spark | 🟡 Intermediate | Medium |

**First PR idea**: Pick an unsupported Spark SQL function (e.g., `array_intersect`) and implement it in the Velox backend.

#### Persona 2: Spark Java/Scala Developer (Catalyst / Spark Internals Expert)

**You know**: Catalyst optimizer, Spark physical plans, DataFrame API
**You want**: Work at the Spark/Gluten integration layer

| Task | Difficulty | Impact |
|------|-----------|--------|
| Fix Spark 3.5 / 4.0 compatibility issues | 🟡 Intermediate | High |
| Improve fallback mechanism (ColumnarToRow transitions) | 🟡 Intermediate | High |
| Add support for new Spark 4.0 operators | 🟡 Intermediate | Very High |
| Write Substrait plan validation tests | 🟢 Beginner | Medium |

**First PR idea**: Add test coverage for a Spark SQL query pattern that currently falls back to vanilla Spark.

#### Persona 3: Data Engineer / Analyst (Non-Coding Contributor)

**You know**: SQL, data pipelines, real-world workloads
**You want**: Help without writing C++ or Scala

| Task | Difficulty | Impact |
|------|-----------|--------|
| Report bugs with detailed reproduction steps | 🟢 Beginner | High |
| Run TPC-DS/TPC-H benchmarks and share results | 🟢 Beginner | Medium |
| Test Gluten with your company's real workloads | 🟢 Beginner | Very High |
| Write blog posts about adoption experience | 🟢 Beginner | High |
| Organize local Gluten meetups or talks | 🟢 Beginner | High |

**First contribution idea**: Download Gluten 1.5.0, run your top 10 slowest Spark queries, and share results on the mailing list.

#### Persona 4: Technical Writer / Documentation Expert

**You know**: Explaining complex systems simply
**You want**: Make Gluten accessible to newcomers

| Task | Difficulty | Impact |
|------|-----------|--------|
| Improve quickstart guide (common setup issues) | 🟢 Beginner | Very High |
| Write "Gluten vs. X" comparison docs | 🟢 Beginner | High |
| Create video tutorials (building, configuring, benchmarking) | 🟡 Intermediate | Very High |
| Document common error messages and fixes | 🟢 Beginner | High |
| Translate docs to Chinese, Japanese, etc. | 🟢 Beginner | High |

#### Persona 5: DevOps / Platform Engineer

**You know**: Kubernetes, Docker, CI/CD, cloud infrastructure
**You want**: Make Gluten easier to deploy and operate

| Task | Difficulty | Impact |
|------|-----------|--------|
| Create official Docker images for Gluten+Spark | 🟡 Intermediate | Very High |
| Write Kubernetes Helm charts | 🟡 Intermediate | High |
| Improve CI/CD pipeline (faster builds, better caching) | 🟡 Intermediate | Medium |
| Write deployment guides for AWS EMR, GCP Dataproc, Azure | 🟢 Beginner | High |

### 🚀 Getting Started (5 Steps)

```
 1️⃣  Star & Fork → github.com/apache/gluten
 2️⃣  Join Mailing List → dev-subscribe@gluten.apache.org
 3️⃣  Join Slack → #incubator-gluten on ASF Slack
 4️⃣  Pick a task from your persona above
 5️⃣  Submit your first PR (or mailing list post!)
```

### ❤️ Why Contribute to Gluten?

1. **Impact**: Your code will power analytics for millions of Spark users.
2. **Learning**: Work alongside engineers from Microsoft, IBM, Meta, Intel.
3. **Career**: "Apache committer" on your resume opens doors.
4. **Community**: Join a welcoming, multi-company, global team.
5. **Timing**: Gluten just graduated. Right now, your contributions can shape the project's next phase.

### Community Channels

| Channel | Link |
|---------|------|
| **GitHub** | [github.com/apache/gluten](https://github.com/apache/gluten) |
| **Mailing List** | dev@gluten.apache.org |
| **Slack** | #incubator-gluten on ASF Slack |
| **WeChat** | Contact weitingchen@apache.org or zhangzc@apache.org |
| **Website** | [gluten.apache.org](https://gluten.apache.org/) |

---

## 14. Q & A

### Key Takeaways

1. 🔧 **Apache Gluten bridges the best of both worlds** — Spark's ecosystem + native engine performance
2. 🏃 **Graduated as ASF TLP in just 2 years** of incubation — one of the fastest
3. 🏢 **Real-world impact**: Microsoft Fabric NEE, IBM watsonx.data, BIGO, and more
4. ⚡ **Performance**: 2–6× speedup with zero application code changes
5. 🎯 **Now is the best time to contribute** — growing community, many open opportunities
6. 🌍 **Cross-ecosystem impact** — contribute to Gluten, grow in Spark & Velox too

### Thank You!

```
              ┌─────────────────────────────────────┐
              │                                     │
              │     🎉 Apache Gluten is now a       │
              │        Top-Level Project!            │
              │                                     │
              │     Join us in building the          │
              │     future of native Spark           │
              │     execution!                       │
              │                                     │
              │     🔗 gluten.apache.org             │
              │     📧 dev@gluten.apache.org         │
              │     ⭐ github.com/apache/gluten      │
              │                                     │
              └─────────────────────────────────────┘
```

**The invitation is open. What will you build with us?**

---

## Appendix A: References

| # | Reference | URL |
|---|-----------|-----|
| 1 | Apache Gluten Official Website | https://gluten.apache.org/ |
| 2 | Apache Gluten GitHub Repository | https://github.com/apache/gluten |
| 3 | ASF Graduation Announcement | https://news.apache.org/foundation/entry/the-apache-software-foundation-graduates-two-open-source-projects-from-incubator |
| 4 | Apache Incubator Status Page | https://incubator.apache.org/projects/gluten.html |
| 5 | Gluten 2025 Roadmap | https://github.com/apache/incubator-gluten/issues/8226 |
| 6 | Velox: Meta's Unified Execution Engine (VLDB 2022) | https://engineering.fb.com/2023/03/09/open-source/velox-open-source-execution-engine/ |
| 7 | Microsoft Fabric NEE Blog | https://blog.fabric.microsoft.com/en/blog/public-preview-of-native-execution-engine-for-apache-spark-on-fabric-data-engineering-and-data-science/ |
| 8 | GlutenCon 2025 | https://gluten.apache.org/2025/11/06/glutencon2025-English.html |
| 9 | Gluten Academic Paper (CDMS 2023) | https://cdmsworkshop.github.io/2023/slides/ShortPaper3.pdf |
| 10 | Gluten Talk at Netflix Open Forum | https://www.youtube.com/watch?v=f5ICT9wNK2A |
| 11 | ASF "Becoming a Committer" Guide | https://community.apache.org/contributors/becomingacommitter.html |
| 12 | Apache Spark Committers Page | https://spark.apache.org/committers.html |
| 13 | Velox Technical Governance | https://velox-lib.io/docs/community/technical-governance/ |

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **TLP** | Top-Level Project at the Apache Software Foundation |
| **ASF** | Apache Software Foundation |
| **PMC** | Project Management Committee |
| **PPMC** | Podling Project Management Committee (during incubation) |
| **Substrait** | Cross-language specification for data compute operations |
| **JNI** | Java Native Interface — bridge between JVM and native code |
| **Arrow** | Apache Arrow — columnar in-memory data format |
| **SIMD** | Single Instruction, Multiple Data — hardware vectorization |
| **NEE** | Native Execution Engine (Microsoft Fabric) |
| **ICLA** | Individual Contributor License Agreement |
